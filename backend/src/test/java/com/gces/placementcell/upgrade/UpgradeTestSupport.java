package com.gces.placementcell.upgrade;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.DepartmentRepository;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BooleanSupplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Shared fixtures for the upgrade tests: every test makes its own department, staff and students
 * (unique codes and register numbers), so tests sharing the in-memory database never collide.
 * Requests go through the real security chain with bearer tokens.
 */
public abstract class UpgradeTestSupport {

    protected static final String PASSWORD = "Password@123";
    private static final AtomicLong ROLL = new AtomicLong(System.nanoTime() % 1_000_000L);

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository userRepository;
    @Autowired protected StudentProfileRepository studentProfileRepository;
    @Autowired protected DepartmentRepository departmentRepository;
    @Autowired protected FacultyProfileRepository facultyProfileRepository;
    @Autowired protected PasswordEncoder passwordEncoder;
    @Autowired protected TokenProvider tokenProvider;

    protected record Actor(User user, String token) {
    }

    protected record Student(StudentProfile profile, User user, String token) {
        public Long id() {
            return profile.getId();
        }
    }

    protected JsonNode call(MockHttpServletRequestBuilder request, String token, Object body, int expectedStatus)
            throws Exception {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON)
                    .content(body instanceof String s ? s : json.writeValueAsString(body));
        }
        MvcResult result = mockMvc.perform(request).andReturn();
        String content = result.getResponse().getContentAsString();
        assertEquals(expectedStatus, result.getResponse().getStatus(),
                result.getRequest().getMethod() + " " + result.getRequest().getRequestURI() + " -> " + content);
        if (content.isBlank() || !(content.startsWith("{") || content.startsWith("["))) {
            return json.createObjectNode();
        }
        return json.readTree(content);
    }

    protected static String tag() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    /** A fresh department with a unique code (letters only, starts with a letter). */
    protected Department newDepartment() {
        StringBuilder code = new StringBuilder("Z");
        String t = UUID.randomUUID().toString().replaceAll("[^a-f]", "");
        for (int i = 0; i < 7; i++) {
            code.append((char) ('A' + (t.length() > i ? t.charAt(i) - 'a' : i) + (int) (Math.random() * 20)));
        }
        String value = code.toString().toUpperCase(Locale.ROOT);
        return departmentRepository.save(Department.builder().code(value).name("Dept " + value + " " + tag()).build());
    }

    protected Actor staff(UserRole role) {
        User user = userRepository.save(User.builder()
                .email(role.name().toLowerCase(Locale.ROOT) + "-" + tag() + "@gces.edu")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(role)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .mustChangePassword(false)
                .build());
        return new Actor(user, tokenProvider.generateToken(user));
    }

    protected Actor admin() {
        return staff(UserRole.ADMIN);
    }

    protected Actor officer() {
        return staff(UserRole.PLACEMENT_OFFICER);
    }

    /** A signed-in faculty advisor assigned to the department (or unassigned when null). */
    protected Actor faculty(Department department) {
        Actor actor = staff(UserRole.FACULTY_ADVISOR);
        facultyProfileRepository.save(FacultyProfile.builder()
                .user(actor.user())
                .department(department)
                .fullName("Advisor " + tag())
                .build());
        return actor;
    }

    protected Student student(Department department) {
        return student(department, "2022-2026");
    }

    protected Student student(Department department, String batch) {
        String roll = String.format("9%011d", ROLL.incrementAndGet() % 100_000_000_000L);
        User user = userRepository.save(User.builder()
                .email("s" + roll + "@example.com")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .mustChangePassword(false)
                .build());
        StudentProfile profile = studentProfileRepository.save(StudentProfile.builder()
                .user(user)
                .rollNo(roll)
                .fullName("Student " + roll)
                .email(user.getEmail())
                .phone("9876543210")
                .department(department.getName())
                .departmentCode(department.getCode())
                .degree("B.E")
                .batch(batch)
                .cgpa(new BigDecimal("7.00"))
                .placementStatus(PlacementStatus.PENDING)
                .profileSetupCompleted(true)
                .build());
        return new Student(profile, user, tokenProvider.generateToken(user));
    }

    protected ObjectNode draftBody(String cgpa, String skill, String certification) {
        ObjectNode data = json.createObjectNode();
        data.putObject("academic").put("cgpa", new BigDecimal(cgpa)).put("totalBacklogs", 0).put("activeBacklogs", 0);
        if (skill != null) {
            data.putArray("skills").addObject().put("skillName", skill).put("proficiency", "ADVANCED");
        }
        if (certification != null) {
            data.putArray("certifications").addObject().put("name", certification).put("issuer", "AWS")
                    .put("issueDate", "2025-01-10");
        }
        ObjectNode body = json.createObjectNode();
        body.set("data", data);
        return body;
    }

    protected static void waitUntil(String what, BooleanSupplier condition) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 8000;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(50);
        }
        fail("Timed out waiting for " + what);
    }
}
