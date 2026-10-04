package com.gces.placementcell.config;

import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Safe bootstrapping mechanism for the initial administrator.
 *
 * Runs on application startup. If no active administrator exists in the database,
 * seeds an initial admin account with credentials configured in application.properties.
 * If an admin already exists, this step is skipped.
 */
@Component
public class AdminDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminDataInitializer.class);

    private final UserRepository userRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.default-email:admin@gces.edu}")
    private String defaultEmail;

    @Value("${app.admin.default-password:Admin@1234}")
    private String defaultPassword;

    @Value("${app.admin.default-name:Placement Officer}")
    private String defaultName;

    public AdminDataInitializer(UserRepository userRepository,
                                AdminProfileRepository adminProfileRepository,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.adminProfileRepository = adminProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.countByRoleAndIsDeletedFalse(UserRole.ADMIN) == 0) {
            log.info("No active admin account found in database. Initializing default admin: {}", defaultEmail);

            User adminUser = User.builder()
                    .email(defaultEmail)
                    .passwordHash(passwordEncoder.encode(defaultPassword))
                    .role(UserRole.ADMIN)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .isDeleted(false)
                    .build();
            adminUser = userRepository.save(adminUser);

            AdminProfile adminProfile = AdminProfile.builder()
                    .user(adminUser)
                    .name(defaultName)
                    .designation("Placement Officer")
                    .build();
            adminProfileRepository.save(adminProfile);

            log.info("Default admin account created successfully.");
        } else {
            log.debug("Admin account already exists in database. Bootstrapping skipped.");
        }
    }
}
