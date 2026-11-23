package com.gces.placementcell.config;

import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.DepartmentRepository;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * DEV ONLY (app.faculty-init.enabled=true): gives CSE, ECE, EEE, MECH and CIVIL a faculty advisor
 * when the department exists and has none. Accounts must change their password at first sign-in.
 * Never logs the password; warns when the built-in dev default is used.
 */
@Slf4j
@Component
@Order(100)
@ConditionalOnProperty(name = "app.faculty-init.enabled", havingValue = "true")
public class FacultyAccountSeeder implements ApplicationRunner {

    private static final List<String> CODES = List.of("CSE", "ECE", "EEE", "MECH", "CIVIL");
    private static final String DEV_DEFAULT = "Faculty@Dev2026";

    private final DepartmentRepository departmentRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String password;

    public FacultyAccountSeeder(DepartmentRepository departmentRepository,
                                FacultyProfileRepository facultyProfileRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.faculty-init.password:${APP_FACULTY_INIT_PASSWORD:" + DEV_DEFAULT + "}}") String password) {
        this.departmentRepository = departmentRepository;
        this.facultyProfileRepository = facultyProfileRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (String code : CODES) {
            Department department = departmentRepository.findByCodeIgnoreCase(code).orElse(null);
            if (department == null || !facultyProfileRepository.findLiveByDepartmentId(department.getId()).isEmpty()) {
                continue;
            }
            String email = code.toLowerCase(Locale.ROOT) + ".advisor@faculty.gces.local";
            if (userRepository.existsByEmail(email)) {
                continue;
            }
            User user = userRepository.save(User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(UserRole.FACULTY_ADVISOR)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(false)
                    .isDeleted(false)
                    .mustChangePassword(true)
                    .build());
            facultyProfileRepository.save(FacultyProfile.builder()
                    .user(user)
                    .department(department)
                    .fullName(code + " Faculty Advisor")
                    .designation("Faculty Advisor")
                    .build());
            log.info("Dev faculty advisor created: {}", email);
            created++;
        }
        if (created > 0 && DEV_DEFAULT.equals(password)) {
            log.warn("Dev faculty advisors use the built-in default password; they must change it at first sign-in. "
                    + "Set APP_FACULTY_INIT_PASSWORD to override. Never enable app.faculty-init on a real database.");
        }
    }
}
