package com.gces.placementcell.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.MvcResult;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

/**
 * The student management redesign, end to end through the real security chain: admin creates
 * students, a student signs in with the register number, is locked to first-login setup until
 * they finish it, and the admin can edit, deactivate, reactivate, reset and delete them.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Student management and first-login flow")
class StudentManagementFlowTest {

    private static final String ADMIN_EMAIL = "flow.admin@gces.edu";
    private static final String ADMIN_PASSWORD = "AdminPass@123";
    private static final String GOOD_PASSWORD = "NewPass@2026";
    private static final AtomicInteger SEQUENCE = new AtomicInteger(100);

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentProfileRepository studentProfileRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String adminToken;

    @BeforeEach
    void signInAdmin() throws Exception {
        if (userRepository.findByEmail(ADMIN_EMAIL).isEmpty()) {
            userRepository.save(User.builder()
                    .email(ADMIN_EMAIL)
                    .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                    .role(UserRole.ADMIN)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build());
        }
        ObjectNode body = json.createObjectNode().put("email", ADMIN_EMAIL).put("password", ADMIN_PASSWORD)
                .put("expectedRole", "ADMIN");
        adminToken = tokenFrom(call(post("/auth/login"), null, body, 200));
    }

    // ---------------------------------------------------------------- helpers

    private static String freshRegisterNumber() {
        return String.format("8301%08d", SEQUENCE.incrementAndGet());
    }

    private JsonNode call(MockHttpServletRequestBuilder request, String token, Object body, int expectedStatus)
            throws Exception {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        MvcResult result = mockMvc.perform(request).andReturn();
        String content = result.getResponse().getContentAsString();
        assertEquals(expectedStatus, result.getResponse().getStatus(),
                result.getRequest().getMethod() + " " + result.getRequest().getRequestURI() + " -> " + content);
        return content.isBlank() ? json.createObjectNode() : json.readTree(content);
    }

    private static String tokenFrom(JsonNode response) {
        return response.path("data").path("token").asText();
    }

    private ObjectNode provisionBody(String registerNumber) {
        return json.createObjectNode().put("registerNumber", registerNumber)
                .put("department", "CSE").put("year", 2026);
    }

    private long provision(String registerNumber) throws Exception {
        return call(post("/admin/students/provision"), adminToken, provisionBody(registerNumber), 201)
                .path("data").path("id").asLong();
    }

    private ObjectNode studentLogin(String registerNumber, String password) {
        return json.createObjectNode().put("registerNumber", registerNumber).put("password", password)
                .put("expectedRole", "STUDENT");
    }

    private ObjectNode setupBody(String password, String email) {
        return json.createObjectNode().put("newPassword", password).put("fullName", "Asha Rao")
                .put("email", email).put("phone", "9876543210");
    }

    private String firstLoginToken(String registerNumber) throws Exception {
        return tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 200));
    }

    /** Provision, sign in and finish setup; returns the student's profile id. */
    private long createSetUpStudent(String registerNumber, String email) throws Exception {
        long id = provision(registerNumber);
        String token = firstLoginToken(registerNumber);
        call(post("/student/account/setup"), token, setupBody(GOOD_PASSWORD, email), 200);
        return id;
    }

    // ------------------------------------------------------------ creating students

    @Test
    @DisplayName("Admin adds a student: the register number is stored uppercase and is the initial password")
    void provisionsASingleStudent() throws Exception {
        String registerNumber = freshRegisterNumber();

        JsonNode created = call(post("/admin/students/provision"), adminToken,
                provisionBody("  " + registerNumber.toLowerCase() + " "), 201);

        JsonNode student = created.path("data");
        assertEquals(registerNumber, student.path("rollNo").asText());
        assertEquals("Computer Science and Engineering", student.path("department").asText());
        assertEquals("CSE", student.path("departmentCode").asText());
        assertEquals("2022-2026", student.path("batch").asText());
        assertFalse(student.path("profileSetupCompleted").asBoolean());
        assertTrue(student.path("email").isMissingNode() || student.path("email").isNull(),
                "the stand-in email is never exposed");
        assertFalse(created.toString().toLowerCase().contains("passwordhash"), "no credential in the response");
        assertFalse(created.toString().contains("$2a$"), "no bcrypt hash in the response");

        // The register number works as the initial password.
        JsonNode login = call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 200);
        assertTrue(login.path("data").path("setupRequired").asBoolean());
    }

    @Test
    @DisplayName("A duplicate register number is rejected whatever case it is typed in")
    void rejectsDuplicateRegisterNumbers() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);

        call(post("/admin/students/provision"), adminToken, provisionBody(registerNumber), 409);
        call(post("/admin/students/provision"), adminToken, provisionBody(registerNumber.toLowerCase()), 409);
        assertEquals(1, studentProfileRepository.findExistingRollNos(java.util.List.of(registerNumber)).size());
    }

    @Test
    @DisplayName("Add validates every field")
    void validatesProvisionInput() throws Exception {
        call(post("/admin/students/provision"), adminToken,
                json.createObjectNode().put("registerNumber", "").put("department", "").putNull("year"), 400);
        call(post("/admin/students/provision"), adminToken,
                provisionBody("bad number!"), 400);
        ObjectNode badYear = provisionBody(freshRegisterNumber()).put("year", 1850);
        call(post("/admin/students/provision"), adminToken, badYear, 400);
    }

    @Test
    @DisplayName("Bulk add creates the range, skips existing numbers, and rejects bad ranges")
    void bulkProvisioning() throws Exception {
        String prefix = String.format("8302%05d", SEQUENCE.incrementAndGet());
        provision(prefix + "002"); // already exists, so it must be skipped

        ObjectNode range = json.createObjectNode().put("registerNumberFrom", prefix + "001")
                .put("registerNumberTo", prefix + "004").put("department", "ECE").put("year", 2027);
        JsonNode result = call(post("/admin/students/provision/bulk"), adminToken, range, 201).path("data");

        assertEquals(4, result.path("requested").asInt());
        assertEquals(3, result.path("created").asInt());
        assertEquals(1, result.path("skipped").asInt());
        assertEquals(prefix + "002", result.path("skippedRegisterNumbers").get(0).asText());
        assertEquals(prefix + "001", result.path("createdRegisterNumbers").get(0).asText());

        // Running it again creates nothing new.
        JsonNode again = call(post("/admin/students/provision/bulk"), adminToken, range, 201).path("data");
        assertEquals(0, again.path("created").asInt());
        assertEquals(4, again.path("skipped").asInt());

        // Each created student can sign in with their own register number.
        call(post("/auth/login"), null, studentLogin(prefix + "003", prefix + "003"), 200);

        ObjectNode reversed = range.deepCopy().put("registerNumberFrom", prefix + "009").put("registerNumberTo", prefix + "001");
        call(post("/admin/students/provision/bulk"), adminToken, reversed, 400);
        ObjectNode mismatched = range.deepCopy().put("registerNumberTo", "930123104004");
        call(post("/admin/students/provision/bulk"), adminToken, mismatched, 400);
        ObjectNode huge = range.deepCopy().put("registerNumberFrom", prefix + "001").put("registerNumberTo", prefix + "500");
        call(post("/admin/students/provision/bulk"), adminToken, huge, 400);
    }

    // ------------------------------------------------------------ first login

    @Test
    @DisplayName("Before setup the student is locked out of everything except setup")
    void studentIsLockedUntilSetupIsDone() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);
        String token = firstLoginToken(registerNumber);

        JsonNode blocked = call(get("/student/profile"), token, null, 403);
        assertEquals("PASSWORD_CHANGE_REQUIRED", blocked.path("code").asText());
        call(get("/student/applications"), token, null, 403);
        call(get("/notifications"), token, null, 403);

        // These stay open so the setup page can work.
        JsonNode me = call(get("/auth/me"), token, null, 200);
        assertTrue(me.path("data").path("setupRequired").asBoolean());
        assertTrue(me.path("data").path("email").isNull() || me.path("data").path("email").isMissingNode());
    }

    @Test
    @DisplayName("Setup enforces a strong new password that is not the register number or the old password")
    void setupValidatesThePassword() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);
        String token = firstLoginToken(registerNumber);
        String email = registerNumber.toLowerCase() + "@example.com";

        call(post("/student/account/setup"), token, setupBody("short1A", email), 400);
        call(post("/student/account/setup"), token, setupBody("alllowercase1", email), 400);
        call(post("/student/account/setup"), token, setupBody("NoDigitsHere", email), 400);
        // The register number is all digits, so it can never satisfy the strength rule: refused.
        call(post("/student/account/setup"), token, setupBody(registerNumber, email), 400);
    }

    @Test
    @DisplayName("Setup validates name, email and phone")
    void setupValidatesTheProfile() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);
        String token = firstLoginToken(registerNumber);
        String email = registerNumber.toLowerCase() + "@example.com";

        call(post("/student/account/setup"), token, setupBody(GOOD_PASSWORD, "not-an-email"), 400);
        call(post("/student/account/setup"), token, setupBody(GOOD_PASSWORD, "someone@pending.gces.local"), 400);
        call(post("/student/account/setup"), token, setupBody(GOOD_PASSWORD, email).put("phone", "12"), 400);
        call(post("/student/account/setup"), token, setupBody(GOOD_PASSWORD, email).put("fullName", ""), 400);

        // Another student's email is refused.
        createSetUpStudent(freshRegisterNumber(), "taken." + registerNumber.toLowerCase() + "@example.com");
        call(post("/student/account/setup"), token,
                setupBody(GOOD_PASSWORD, "taken." + registerNumber.toLowerCase() + "@example.com"), 400);
    }

    @Test
    @DisplayName("Completing setup unlocks the account, swaps in the new password, and retires the old token")
    void completingSetup() throws Exception {
        String registerNumber = freshRegisterNumber();
        long profileId = provision(registerNumber);
        String firstToken = firstLoginToken(registerNumber);
        String email = registerNumber.toLowerCase() + "@example.com";

        JsonNode done = call(post("/student/account/setup"), firstToken, setupBody(GOOD_PASSWORD, email), 200);
        String newToken = tokenFrom(done);
        assertNotEquals(firstToken, newToken);
        assertFalse(done.path("data").path("setupRequired").asBoolean());
        assertEquals(email, done.path("data").path("email").asText());
        assertFalse(done.toString().contains(GOOD_PASSWORD), "the password is never echoed");

        // The new token works everywhere; the old one no longer matches the account.
        call(get("/student/profile"), newToken, null, 200);
        call(get("/student/profile"), firstToken, null, 401);

        // Setup cannot be repeated to change the password without the current one.
        call(post("/student/account/setup"), newToken, setupBody("Another@2026", email), 400);

        // Signing in again: the new password works, the register number no longer does.
        JsonNode relogin = call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200);
        assertFalse(relogin.path("data").path("setupRequired").asBoolean());
        call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 401);

        // The admin now sees the details the student entered.
        JsonNode seen = call(get("/admin/students/" + profileId), adminToken, null, 200).path("data");
        assertEquals("Asha Rao", seen.path("fullName").asText());
        assertEquals(email, seen.path("email").asText());
    }

    @Test
    @DisplayName("A student can change their password later, but must give the current one")
    void changingThePassword() throws Exception {
        String registerNumber = freshRegisterNumber();
        createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String token = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));

        ObjectNode wrongCurrent = json.createObjectNode().put("currentPassword", "Wrong@1234").put("newPassword", "Fresh@2026x");
        // A 400, not a 401: the client treats 401 as an expired session.
        call(post("/student/account/change-password"), token, wrongCurrent, 400);

        ObjectNode ok = json.createObjectNode().put("currentPassword", GOOD_PASSWORD).put("newPassword", "Fresh@2026x");
        call(post("/student/account/change-password"), token, ok, 200);
        call(post("/auth/login"), null, studentLogin(registerNumber, "Fresh@2026x"), 200);
        call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 401);
    }

    // ------------------------------------------------------------ login rules

    @Test
    @DisplayName("A student cannot sign in with an email, even with the right password")
    void studentsCannotUseEmailLogin() throws Exception {
        String registerNumber = freshRegisterNumber();
        String email = registerNumber.toLowerCase() + "@example.com";
        createSetUpStudent(registerNumber, email);

        ObjectNode byEmail = json.createObjectNode().put("email", email).put("password", GOOD_PASSWORD)
                .put("expectedRole", "STUDENT");
        call(post("/auth/login"), null, byEmail, 403);
        // A wrong password still gets the generic message, so the email cannot be probed.
        ObjectNode wrongPassword = json.createObjectNode().put("email", email).put("password", "Wrong@1234");
        call(post("/auth/login"), null, wrongPassword, 401);
    }

    @Test
    @DisplayName("The initial password works in any letter case, but only until the student sets their own")
    void initialPasswordIgnoresCase() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);

        // Typed in lowercase, for both the register number and the password.
        JsonNode login = call(post("/auth/login"), null,
                studentLogin(registerNumber.toLowerCase(), registerNumber.toLowerCase()), 200);
        assertTrue(login.path("data").path("setupRequired").asBoolean());

        String token = tokenFrom(login);
        call(post("/student/account/setup"), token,
                setupBody(GOOD_PASSWORD, registerNumber.toLowerCase() + "@example.com"), 200);

        // Once set, the password is exact: the old lenient match no longer applies.
        call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber.toLowerCase()), 401);
        call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200);
        call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD.toLowerCase()), 401);
    }

    @Test
    @DisplayName("Signing in needs a register number or an email")
    void loginNeedsAnIdentifier() throws Exception {
        call(post("/auth/login"), null, json.createObjectNode().put("password", "Whatever@123"), 400);
    }

    @Test
    @DisplayName("A student cannot sign in through the admin portal")
    void studentCannotUseTheAdminPortal() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);
        ObjectNode asAdmin = studentLogin(registerNumber, registerNumber).put("expectedRole", "ADMIN");
        call(post("/auth/login"), null, asAdmin, 403);
    }

    @Test
    @DisplayName("Repeated wrong passwords lock the account for a while, even against the right password")
    void guessingIsThrottled() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);

        for (int i = 0; i < 5; i++) {
            call(post("/auth/login"), null, studentLogin(registerNumber, "Guess" + i + "@2026"), 401);
        }
        JsonNode locked = call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 403);
        assertTrue(locked.path("message").asText().toLowerCase().contains("too many"));

        // An admin password reset lifts the lock.
        long id = studentProfileRepository.findByRollNo(registerNumber).orElseThrow().getId();
        call(post("/admin/students/" + id + "/reset-password"), adminToken, null, 200);
        call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 200);
    }

    @Test
    @DisplayName("There is no public student registration")
    void registrationIsGone() throws Exception {
        ObjectNode body = json.createObjectNode().put("email", "self.signup@example.com").put("password", "Password123")
                .put("fullName", "Self Signup").put("rollNo", "SELF1234").put("role", "STUDENT");
        MvcResult result = mockMvc.perform(post("/auth/register/student").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andReturn();
        assertTrue(result.getResponse().getStatus() == 401 || result.getResponse().getStatus() == 403,
                "was " + result.getResponse().getStatus());
        assertTrue(userRepository.findByEmail("self.signup@example.com").isEmpty());
    }

    // ------------------------------------------------------------ admin operations

    @Test
    @DisplayName("Admin edits a student's profile: name, email, department, year, CGPA, backlogs, skills, placement")
    void adminEditsAProfile() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");

        ObjectNode edit = json.createObjectNode()
                .put("fullName", "Asha R").put("email", "asha." + registerNumber.toLowerCase() + "@example.com")
                .put("department", "MECH").put("year", 2027)
                .put("cgpa", 8.75).put("totalBacklogs", 2).put("activeBacklogs", 1)
                .put("placementStatus", "ACTIVE");
        edit.putArray("skills").add("Java").add("React");

        JsonNode saved = call(put("/admin/students/" + id), adminToken, edit, 200).path("data");
        assertEquals("Asha R", saved.path("fullName").asText());
        assertEquals("Mechanical Engineering", saved.path("department").asText());
        assertEquals("MECH", saved.path("departmentCode").asText());
        assertEquals("2023-2027", saved.path("batch").asText());
        assertEquals(8.75, saved.path("cgpa").asDouble(), 0.001);
        assertEquals(1, saved.path("activeBacklogs").asInt());
        assertEquals("ACTIVE", saved.path("placementStatus").asText());
        assertEquals(2, saved.path("skills").size());
    }

    @Test
    @DisplayName("Editing rejects invalid values and duplicate emails with a clear error")
    void adminEditValidation() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String other = freshRegisterNumber();
        createSetUpStudent(other, other.toLowerCase() + "@example.com");

        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("cgpa", 11), 400);
        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("cgpa", -1), 400);
        call(put("/admin/students/" + id), adminToken,
                json.createObjectNode().put("totalBacklogs", 1).put("activeBacklogs", 3), 400);
        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("email", "bad"), 400);
        call(put("/admin/students/" + id), adminToken,
                json.createObjectNode().put("email", other.toLowerCase() + "@example.com"), 400);
        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("rollNo", other), 400);
        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("year", 1700), 400);
        call(put("/admin/students/999999"), adminToken, json.createObjectNode().put("cgpa", 8), 404);
    }

    @Test
    @DisplayName("Deactivating blocks sign-in and kills the active session at once; reactivating restores it")
    void deactivateAndReactivate() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String token = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));
        call(get("/student/profile"), token, null, 200);

        JsonNode off = call(patch("/admin/students/" + id + "/deactivate"), adminToken, null, 200).path("data");
        assertFalse(off.path("isActive").asBoolean());
        assertEquals("INACTIVE", off.path("accountStatus").asText());

        call(get("/student/profile"), token, null, 401);
        JsonNode blocked = call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 403);
        assertTrue(blocked.path("message").asText().toLowerCase().contains("inactive"));

        JsonNode on = call(patch("/admin/students/" + id + "/reactivate"), adminToken, null, 200).path("data");
        assertTrue(on.path("isActive").asBoolean());
        assertEquals("ACTIVE", on.path("accountStatus").asText());
        String again = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));
        call(get("/student/profile"), again, null, 200);
    }

    @Test
    @DisplayName("Admin can reset a password back to the register number, forcing a change")
    void resetPassword() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");

        call(post("/admin/students/" + id + "/reset-password"), adminToken, null, 200);

        call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 401);
        JsonNode login = call(post("/auth/login"), null, studentLogin(registerNumber, registerNumber), 200);
        assertTrue(login.path("data").path("setupRequired").asBoolean());
        call(get("/student/profile"), tokenFrom(login), null, 403);
    }

    @Test
    @DisplayName("Deleting removes the student from the list and from sign-in")
    void deleteStudent() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String token = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));

        call(delete("/admin/students/" + id), adminToken, null, 200);

        call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 401);
        call(get("/student/profile"), token, null, 401);
        call(get("/admin/students/" + id), adminToken, null, 404);
        // The register number stays reserved, so it cannot be handed out again by accident.
        call(post("/admin/students/provision"), adminToken, provisionBody(registerNumber), 409);
        call(patch("/admin/students/" + id + "/reactivate"), adminToken, null, 404);
    }

    @Test
    @DisplayName("The student list shows who has not finished setup, and hides stand-in emails")
    void listShowsSetupState() throws Exception {
        String registerNumber = freshRegisterNumber();
        provision(registerNumber);

        JsonNode page = call(get("/admin/students?size=200&search=" + registerNumber), adminToken, null, 200).path("data");
        assertEquals(1, page.path("content").size());
        JsonNode row = page.path("content").get(0);
        assertEquals(registerNumber, row.path("rollNo").asText());
        assertFalse(row.path("profileSetupCompleted").asBoolean());
        assertFalse(row.toString().contains("pending.gces.local"));
    }

    // ------------------------------------------------------------ departments

    private ObjectNode departmentBody(String code, String name) {
        return json.createObjectNode().put("code", code).put("name", name);
    }

    private JsonNode departmentNamed(String code) throws Exception {
        for (JsonNode d : call(get("/admin/departments"), adminToken, null, 200).path("data")) {
            if (code.equalsIgnoreCase(d.path("code").asText())) {
                return d;
            }
        }
        throw new AssertionError("department " + code + " not listed");
    }

    @Test
    @DisplayName("The college's departments are seeded and listed, with how many students each has")
    void departmentsAreSeeded() throws Exception {
        JsonNode list = call(get("/admin/departments"), adminToken, null, 200).path("data");
        java.util.Set<String> codes = new java.util.HashSet<>();
        list.forEach(d -> codes.add(d.path("code").asText()));
        assertTrue(codes.containsAll(java.util.Set.of("CSE", "ECE", "EEE", "CIVIL", "MECH", "MCT")), codes.toString());

        String registerNumber = freshRegisterNumber();
        long before = departmentNamed("CSE").path("studentCount").asLong();
        provision(registerNumber);
        assertEquals(before + 1, departmentNamed("CSE").path("studentCount").asLong());
    }

    @Test
    @DisplayName("Admin adds a new department and can then add students to it")
    void addsADepartment() throws Exception {
        int n = SEQUENCE.incrementAndGet();
        String code = "TD" + n;

        JsonNode created = call(post("/admin/departments"), adminToken,
                departmentBody(code.toLowerCase(), "Test Department " + n), 201).path("data");
        assertEquals(code, created.path("code").asText(), "stored uppercase");
        assertTrue(created.path("isActive").asBoolean());

        ObjectNode body = provisionBody(freshRegisterNumber()).put("department", code);
        JsonNode student = call(post("/admin/students/provision"), adminToken, body, 201).path("data");
        assertEquals(code, student.path("departmentCode").asText());
        assertEquals("Test Department " + n, student.path("department").asText());
        assertEquals(1, departmentNamed(code).path("studentCount").asInt());
    }

    @Test
    @DisplayName("A department needs a valid code and name, and neither may repeat")
    void departmentValidation() throws Exception {
        int n = SEQUENCE.incrementAndGet();
        call(post("/admin/departments"), adminToken, departmentBody("", ""), 400);
        call(post("/admin/departments"), adminToken, departmentBody("1BAD", "Starts With A Digit"), 400);
        call(post("/admin/departments"), adminToken, departmentBody("TOOLONGCODE1", "Too Long Code"), 400);
        call(post("/admin/departments"), adminToken, departmentBody("A", "Too Short"), 400);
        call(post("/admin/departments"), adminToken, departmentBody("TV" + n, "xy"), 400);

        call(post("/admin/departments"), adminToken, departmentBody("cse", "Another Name " + n), 409);
        call(post("/admin/departments"), adminToken, departmentBody("TW" + n, "computer science and engineering"), 409);
    }

    @Test
    @DisplayName("An unknown department is refused with a message that says where to add it")
    void unknownDepartmentIsRefused() throws Exception {
        JsonNode error = call(post("/admin/students/provision"), adminToken,
                provisionBody(freshRegisterNumber()).put("department", "NOSUCH"), 400);
        assertTrue(error.path("message").asText().contains("Departments"), error.toString());

        ObjectNode range = json.createObjectNode().put("registerNumberFrom", "840000000001").put("registerNumberTo", "840000000003")
                .put("department", "NOSUCH").put("year", 2026);
        call(post("/admin/students/provision/bulk"), adminToken, range, 400);
        assertTrue(studentProfileRepository.findExistingRollNos(java.util.List.of("840000000001")).isEmpty());
    }

    @Test
    @DisplayName("Admin can rename a department; the code stays fixed")
    void renamesADepartment() throws Exception {
        int n = SEQUENCE.incrementAndGet();
        long id = call(post("/admin/departments"), adminToken, departmentBody("TR" + n, "Before " + n), 201)
                .path("data").path("id").asLong();

        JsonNode renamed = call(put("/admin/departments/" + id), adminToken,
                json.createObjectNode().put("name", "After " + n), 200).path("data");

        assertEquals("After " + n, renamed.path("name").asText());
        assertEquals("TR" + n, renamed.path("code").asText());
        call(put("/admin/departments/" + id), adminToken, json.createObjectNode().put("name", "x"), 400);
        call(put("/admin/departments/" + id), adminToken, json.createObjectNode().put("name", "Computer Science and Engineering"), 409);
        call(put("/admin/departments/999999"), adminToken, json.createObjectNode().put("name", "Whatever"), 404);
    }

    @Test
    @DisplayName("A deactivated department takes no new students, but existing students stay in it")
    void deactivatedDepartment() throws Exception {
        int n = SEQUENCE.incrementAndGet();
        String code = "TA" + n;
        long id = call(post("/admin/departments"), adminToken, departmentBody(code, "Inactive Test " + n), 201)
                .path("data").path("id").asLong();
        long studentId = call(post("/admin/students/provision"), adminToken,
                provisionBody(freshRegisterNumber()).put("department", code), 201).path("data").path("id").asLong();

        call(put("/admin/departments/" + id), adminToken, json.createObjectNode().put("isActive", false), 200);

        JsonNode refused = call(post("/admin/students/provision"), adminToken,
                provisionBody(freshRegisterNumber()).put("department", code), 400);
        assertTrue(refused.path("message").asText().toLowerCase().contains("inactive"));
        // An existing student can be edited without being moved out, but cannot be moved in.
        call(put("/admin/students/" + studentId), adminToken, json.createObjectNode().put("cgpa", 8), 200);
        long otherId = createSetUpStudent(freshRegisterNumber(), "dept.other" + n + "@example.com");
        call(put("/admin/students/" + otherId), adminToken, json.createObjectNode().put("department", code), 400);

        call(put("/admin/departments/" + id), adminToken, json.createObjectNode().put("isActive", true), 200);
        call(post("/admin/students/provision"), adminToken,
                provisionBody(freshRegisterNumber()).put("department", code), 201);
    }

    @Test
    @DisplayName("A department in use cannot be deleted, an unused one can")
    void deletingADepartment() throws Exception {
        int n = SEQUENCE.incrementAndGet();
        long used = call(post("/admin/departments"), adminToken, departmentBody("TU" + n, "Used " + n), 201)
                .path("data").path("id").asLong();
        long unused = call(post("/admin/departments"), adminToken, departmentBody("TE" + n, "Unused " + n), 201)
                .path("data").path("id").asLong();
        call(post("/admin/students/provision"), adminToken,
                provisionBody(freshRegisterNumber()).put("department", "TU" + n), 201);

        JsonNode refused = call(delete("/admin/departments/" + used), adminToken, null, 400);
        assertTrue(refused.path("message").asText().toLowerCase().contains("deactivate"));

        call(delete("/admin/departments/" + unused), adminToken, null, 200);
        call(delete("/admin/departments/" + unused), adminToken, null, 404);
        assertEquals(1, departmentNamed("TU" + n).path("studentCount").asInt());
    }

    @Test
    @DisplayName("Editing a student's department updates both the name and the code")
    void editingAStudentsDepartment() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");

        JsonNode saved = call(put("/admin/students/" + id), adminToken,
                json.createObjectNode().put("department", "MCT"), 200).path("data");

        assertEquals("MCT", saved.path("departmentCode").asText());
        assertEquals("Mechatronics Engineering", saved.path("department").asText());
        call(put("/admin/students/" + id), adminToken, json.createObjectNode().put("department", "NOSUCH"), 400);
    }

    @Test
    @DisplayName("Department management is for admins only")
    void departmentEndpointsAreProtected() throws Exception {
        String registerNumber = freshRegisterNumber();
        createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String studentToken = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));
        ObjectNode body = departmentBody("TZ1", "Nobody Allowed");

        for (String token : new String[]{null, studentToken}) {
            int expected = token == null ? 401 : 403;
            call(get("/admin/departments"), token, null, expected);
            call(post("/admin/departments"), token, body, expected);
            call(put("/admin/departments/1"), token, json.createObjectNode().put("name", "Nope Nope"), expected);
            call(delete("/admin/departments/1"), token, null, expected);
        }
    }

    // ------------------------------------------------------------ unauthorized access

    @Test
    @DisplayName("Every new admin endpoint refuses anonymous callers and students")
    void adminEndpointsAreProtected() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = createSetUpStudent(registerNumber, registerNumber.toLowerCase() + "@example.com");
        String studentToken = tokenFrom(call(post("/auth/login"), null, studentLogin(registerNumber, GOOD_PASSWORD), 200));
        ObjectNode body = provisionBody(freshRegisterNumber());
        ObjectNode range = json.createObjectNode().put("registerNumberFrom", "850000000001").put("registerNumberTo", "850000000003")
                .put("department", "CIVIL").put("year", 2026);

        String[] anonymousAndStudent = {null, studentToken};
        for (String token : anonymousAndStudent) {
            int expected = token == null ? 401 : 403;
            call(post("/admin/students/provision"), token, body, expected);
            call(post("/admin/students/provision/bulk"), token, range, expected);
            call(put("/admin/students/" + id), token, json.createObjectNode().put("cgpa", 9), expected);
            call(patch("/admin/students/" + id + "/deactivate"), token, null, expected);
            call(patch("/admin/students/" + id + "/reactivate"), token, null, expected);
            call(post("/admin/students/" + id + "/reset-password"), token, null, expected);
            call(delete("/admin/students/" + id), token, null, expected);
            call(get("/admin/students"), token, null, expected);
            call(post("/admin/students/profile-reminders"), token, null, expected);
        }
        // And nothing changed.
        assertTrue(userRepository.findByEmail(registerNumber.toLowerCase() + "@example.com").orElseThrow().getIsActive());
    }

    @Test
    @DisplayName("The student account endpoints are for students only")
    void studentAccountEndpointsAreProtected() throws Exception {
        ObjectNode setup = setupBody(GOOD_PASSWORD, "someone@example.com");
        call(post("/student/account/setup"), null, setup, 401);
        call(post("/student/account/setup"), adminToken, setup, 403);
        call(post("/student/account/change-password"), null,
                json.createObjectNode().put("currentPassword", "x").put("newPassword", "Valid@2026a"), 401);
    }

    @Test
    @DisplayName("No response ever carries a password or hash")
    void noCredentialsInResponses() throws Exception {
        String registerNumber = freshRegisterNumber();
        long id = provision(registerNumber);
        String token = firstLoginToken(registerNumber);
        String setupResponse = call(post("/student/account/setup"), token,
                setupBody(GOOD_PASSWORD, registerNumber.toLowerCase() + "@example.com"), 200).toString();
        String detail = call(get("/admin/students/" + id), adminToken, null, 200).toString();
        String list = call(get("/admin/students?size=200&search=" + registerNumber), adminToken, null, 200).toString();

        for (String body : new String[]{setupResponse, detail, list}) {
            assertFalse(body.toLowerCase().contains("passwordhash"), body);
            assertFalse(body.toLowerCase().contains("\"password\""), body);
            assertFalse(body.contains("$2a$"), "no bcrypt hash");
            assertFalse(body.contains(GOOD_PASSWORD));
        }
    }
}
