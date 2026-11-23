package com.gces.placementcell.upgrade;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gces.placementcell.entity.Department;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Student draft -> submit -> faculty review -> official profile, through the real security chain. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Profile verification flow")
class ProfileVerificationFlowTest extends UpgradeTestSupport {

    private static List<String> texts(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(n -> values.add(n.asText()));
        return values;
    }

    private static boolean hasSkill(JsonNode detail, String name) {
        for (JsonNode s : detail.path("skills")) {
            if (name.equals(s.path("skillName").asText())) {
                return true;
            }
        }
        return false;
    }

    @Test
    @DisplayName("Draft, submit, faculty notified with actionUrl, approve -> official profile updated and VERIFIED; old values until then")
    void draftSubmitApprove() throws Exception {
        Department dept = newDepartment();
        Actor advisor = faculty(dept);
        Actor admin = admin();
        Actor officer = officer();
        Student s = student(dept);

        JsonNode none = call(get("/student/profile/draft"), s.token(), null, 200).path("data");
        assertEquals("NONE", none.path("status").asText());
        assertTrue(none.path("versionId").isNull() || none.path("versionId").isMissingNode());

        JsonNode draft = call(put("/student/profile/draft"), s.token(), draftBody("9.10", "Kotlin", "AWS CCP"), 200).path("data");
        assertEquals("DRAFT", draft.path("status").asText());
        assertTrue(texts(draft.path("changedSections")).containsAll(List.of("ACADEMIC", "SKILLS", "CERTIFICATIONS")));
        assertTrue(draft.path("canSubmit").asBoolean());

        JsonNode pending = call(post("/student/profile/draft/submit"), s.token(),
                json.createObjectNode().put("studentNote", "Updated CGPA"), 200).path("data");
        assertEquals("PENDING", pending.path("status").asText());
        long versionId = pending.path("versionId").asLong();

        // The advisor sees it and is notified with a link to it.
        JsonNode list = call(get("/faculty/verifications"), advisor.token(), null, 200).path("data");
        assertEquals(versionId, list.path("content").get(0).path("id").asLong());
        waitUntil("faculty notification", () -> {
            try {
                for (JsonNode n : call(get("/notifications"), advisor.token(), null, 200).path("data").path("content")) {
                    if (("/faculty/verifications/" + versionId).equals(n.path("actionUrl").asText())
                            && "VERIFICATION".equals(n.path("notificationType").asText())) {
                        return true;
                    }
                }
                return false;
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        });

        // Before approval nobody but the student sees the pending values.
        for (Actor staff : List.of(admin, officer)) {
            JsonNode detail = call(get("/admin/students/" + s.id()), staff.token(), null, 200).path("data");
            assertEquals(7.0, detail.path("cgpa").asDouble(), 0.001);
            assertFalse(hasSkill(detail, "Kotlin"));
            assertEquals("PENDING", detail.path("profileVerificationStatus").asText());
            assertEquals(versionId, detail.path("pendingVersionId").asLong());
            JsonNode row = call(get("/admin/students").param("search", s.profile().getRollNo()), staff.token(), null, 200)
                    .path("data").path("content").get(0);
            assertEquals(7.0, row.path("cgpa").asDouble(), 0.001);
        }

        JsonNode approved = call(post("/faculty/verifications/" + versionId + "/approve"), advisor.token(),
                json.createObjectNode().put("comment", "Looks good"), 200).path("data");
        assertEquals("APPROVED", approved.path("status").asText());

        JsonNode detail = call(get("/admin/students/" + s.id()), admin.token(), null, 200).path("data");
        assertEquals(9.1, detail.path("cgpa").asDouble(), 0.001);
        assertTrue(hasSkill(detail, "Kotlin"));
        assertEquals("AWS CCP", detail.path("certifications").get(0).path("name").asText());
        assertEquals("VERIFIED", detail.path("profileVerificationStatus").asText());
        assertFalse(detail.path("profileVerifiedAt").isMissingNode());

        // The student's own official profile shows the verified data too.
        JsonNode own = call(get("/student/profile"), s.token(), null, 200).path("data");
        assertEquals("AWS CCP", own.path("certifications").get(0).path("name").asText());
        assertEquals("VERIFIED", own.path("profileVerificationStatus").asText());
        assertEquals("NONE", call(get("/student/profile/draft"), s.token(), null, 200).path("data").path("status").asText());
    }

    @Test
    @DisplayName("Reject needs a comment; student sees it, edits into a NEW draft (rejected row kept), resubmits, approved")
    void rejectEditResubmit() throws Exception {
        Department dept = newDepartment();
        Actor advisor = faculty(dept);
        Student s = student(dept);

        call(put("/student/profile/draft"), s.token(), draftBody("8.40", null, null), 200);
        long first = call(post("/student/profile/draft/submit"), s.token(), null, 200).path("data").path("versionId").asLong();

        call(post("/faculty/verifications/" + first + "/reject"), advisor.token(), json.createObjectNode(), 400);
        call(post("/faculty/verifications/" + first + "/reject"), advisor.token(),
                json.createObjectNode().put("comment", "   "), 400);
        ObjectNode reject = json.createObjectNode().put("comment", "Attach your marksheet");
        reject.putObject("sectionComments").put("ACADEMIC", "CGPA does not match records");
        call(post("/faculty/verifications/" + first + "/reject"), advisor.token(), reject, 200);
        // A decided request cannot be decided again.
        call(post("/faculty/verifications/" + first + "/approve"), advisor.token(), null, 409);

        JsonNode rejected = call(get("/student/profile/draft"), s.token(), null, 200).path("data");
        assertEquals("REJECTED", rejected.path("status").asText());
        assertEquals("Attach your marksheet", rejected.path("reviewComment").asText());
        assertEquals("CGPA does not match records", rejected.path("sectionComments").path("ACADEMIC").asText());
        assertEquals("REJECTED", call(get("/admin/students/" + s.id()), admin().token(), null, 200)
                .path("data").path("profileVerificationStatus").asText());

        JsonNode edited = call(put("/student/profile/draft"), s.token(), draftBody("8.30", null, null), 200).path("data");
        assertEquals("DRAFT", edited.path("status").asText());
        assertNotEquals(first, edited.path("versionId").asLong());

        JsonNode history = call(get("/student/verifications/" + first), s.token(), null, 200).path("data");
        assertEquals("REJECTED", history.path("status").asText());
        assertEquals(8.4, history.path("proposed").path("academic").path("cgpa").asDouble(), 0.001);

        long second = call(post("/student/profile/draft/submit"), s.token(), null, 200).path("data").path("versionId").asLong();
        call(post("/faculty/verifications/" + second + "/approve"), advisor.token(), null, 200);
        assertEquals(8.3, studentProfileRepository.findById(s.id()).orElseThrow().getCgpa().doubleValue(), 0.001);
        assertEquals(2, call(get("/student/verifications"), s.token(), null, 200).path("data").size());
    }

    @Test
    @DisplayName("Withdraw, discard, 409 while pending, 400 on empty submit, validation errors, legacy writes 409")
    void draftRules() throws Exception {
        Department dept = newDepartment();
        faculty(dept);
        Student s = student(dept);

        // Nothing to submit: no draft at all, and a draft equal to the official profile.
        call(post("/student/profile/draft/submit"), s.token(), null, 400);
        call(put("/student/profile/draft"), s.token(), draftBody("7.00", null, null), 200);
        call(post("/student/profile/draft/submit"), s.token(), null, 400);

        call(put("/student/profile/draft"), s.token(), draftBody("8.00", "Go", null), 200);
        long pendingId = call(post("/student/profile/draft/submit"), s.token(), null, 200).path("data").path("versionId").asLong();
        call(put("/student/profile/draft"), s.token(), draftBody("8.50", null, null), 409);
        call(delete("/student/profile/draft"), s.token(), null, 409);

        JsonNode withdrawn = call(post("/student/profile/draft/withdraw"), s.token(), null, 200).path("data");
        assertEquals("DRAFT", withdrawn.path("status").asText());
        assertNotEquals(pendingId, withdrawn.path("versionId").asLong());
        assertEquals(8.0, withdrawn.path("data").path("academic").path("cgpa").asDouble(), 0.001, "draft keeps the edits");
        assertEquals("WITHDRAWN", call(get("/student/verifications/" + pendingId), s.token(), null, 200)
                .path("data").path("status").asText());

        call(delete("/student/profile/draft"), s.token(), null, 200);
        assertEquals("NONE", call(get("/student/profile/draft"), s.token(), null, 200).path("data").path("status").asText());
        call(delete("/student/profile/draft"), s.token(), null, 404);

        // Validation
        call(put("/student/profile/draft"), s.token(), draftBody("11.00", null, null), 400);
        ObjectNode backlogs = draftBody("7.50", null, null);
        ((ObjectNode) backlogs.path("data").path("academic")).put("totalBacklogs", 1).put("activeBacklogs", 2);
        call(put("/student/profile/draft"), s.token(), backlogs, 400);
        ObjectNode dupes = draftBody("7.50", "Java", null);
        ((com.fasterxml.jackson.databind.node.ArrayNode) dupes.path("data").path("skills")).addObject().put("skillName", "java");
        call(put("/student/profile/draft"), s.token(), dupes, 400);
        ObjectNode badUrl = json.createObjectNode();
        badUrl.putObject("data").putObject("personal").put("fullName", "X Y").put("githubUrl", "ftp://example.com/x");
        call(put("/student/profile/draft"), s.token(), badUrl, 400);
        ObjectNode foreignFile = json.createObjectNode();
        foreignFile.putObject("data").putObject("resume").put("resumeUrl", "/api/files/download/verification/abcdefghijkl_v999999_cv.pdf");
        call(put("/student/profile/draft"), s.token(), foreignFile, 400);
        call(put("/student/profile/draft"), s.token(), "{\"data\":", 400);
        // Unknown keys are ignored; admin-managed fields cannot be smuggled in.
        ObjectNode sneaky = draftBody("7.20", null, null);
        ((ObjectNode) sneaky.path("data")).put("rollNo", "HACKED").put("departmentCode", "XYZ");
        call(put("/student/profile/draft"), s.token(), sneaky, 200);

        // Old direct writes are refused; the preference toggle still applies immediately.
        call(put("/student/skills"), s.token(), "[\"Hacking\"]", 409);
        call(post("/student/education"), s.token(), json.createObjectNode(), 409);
        assertEquals(409, mockMvc.perform(multipart("/students/" + s.id() + "/resume")
                        .file(new MockMultipartFile("file", "cv.pdf", "application/pdf", new byte[]{1, 2}))
                        .header("Authorization", "Bearer " + s.token()))
                .andReturn().getResponse().getStatus());
        JsonNode pref = call(put("/student/profile"), s.token(),
                json.createObjectNode().put("fullName", "Ignored Name").put("isOpenToOpportunities", false), 200).path("data");
        assertFalse(pref.path("isOpenToOpportunities").asBoolean());
        assertEquals(s.profile().getFullName(), pref.path("fullName").asText(), "verified fields are not changed");
    }

    @Test
    @DisplayName("Verification uploads: owner, same-department faculty and admin may read; other students and officers (pending only) may not")
    void verificationFileAccess() throws Exception {
        Department dept = newDepartment();
        Department other = newDepartment();
        Actor advisor = faculty(dept);
        Actor otherAdvisor = faculty(other);
        Student owner = student(dept);
        Student stranger = student(dept);

        MvcResult upload = mockMvc.perform(multipart("/student/verification/files")
                        .file(new MockMultipartFile("file", "marksheet.pdf", "application/pdf", "%PDF-1.4 test".getBytes()))
                        .param("section", "ACADEMIC")
                        .header("Authorization", "Bearer " + owner.token()))
                .andReturn();
        assertEquals(200, upload.getResponse().getStatus(), upload.getResponse().getContentAsString());
        JsonNode file = json.readTree(upload.getResponse().getContentAsString()).path("data");
        String url = file.path("fileUrl").asText();
        assertTrue(url.startsWith("/api/files/download/verification/"), url);
        String path = url.substring("/api".length());

        mockMvc.perform(multipart("/student/verification/files")
                        .file(new MockMultipartFile("file", "evil.exe", "application/octet-stream", new byte[]{1}))
                        .header("Authorization", "Bearer " + owner.token()))
                .andExpect(r -> assertEquals(400, r.getResponse().getStatus()));

        call(get(path), owner.token(), null, 200);
        call(get(path), advisor.token(), null, 200);
        call(get(path), admin().token(), null, 200);
        call(get(path), stranger.token(), null, 403);
        call(get(path), otherAdvisor.token(), null, 403);
        call(get(path), officer().token(), null, 403);

        // Once approved as the official resume, officers may read it.
        ObjectNode body = json.createObjectNode();
        body.putObject("data").putObject("resume").put("resumeUrl", url).put("fileName", "marksheet.pdf");
        call(put("/student/profile/draft"), owner.token(), body, 200);
        long id = call(post("/student/profile/draft/submit"), owner.token(), null, 200).path("data").path("versionId").asLong();
        call(post("/faculty/verifications/" + id + "/approve"), advisor.token(), null, 200);
        call(get(path), officer().token(), null, 200);
        assertEquals(url, studentProfileRepository.findById(owner.id()).orElseThrow().getResumeUrl());
        call(get("/students/" + owner.id() + "/resume/download"), advisor.token(), null, 200);
    }
}
