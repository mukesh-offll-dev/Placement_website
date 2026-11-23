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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Safe bootstrapping mechanism for the initial administrator.
 *
 * Runs on application startup. If no active administrator exists in the database,
 * seeds an initial admin account with credentials configured in application.properties.
 * If an admin already exists, this step is skipped.
 */
@Component
// Only creates the first admin on an empty database (never any jobs or students). It has its own switch so
// turning demo data off does not stop the first admin from being created; tests set it false.
@ConditionalOnProperty(name = "app.admin-init.enabled", havingValue = "true", matchIfMissing = true)
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

    /** The built-in fallback; using it on a reachable server is a security risk. */
    private static final String BUILT_IN_DEFAULT_PASSWORD = "Admin@1234";

    @Override
    public void run(String... args) {
        if (userRepository.countByRoleAndIsDeletedFalse(UserRole.ADMIN) > 0) {
            log.debug("Admin account already exists in database. Bootstrapping skipped.");
            return;
        }
        String email = defaultEmail == null ? "" : defaultEmail.trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty()) {
            log.warn("No admin exists and app.admin.default-email is blank; no admin was created.");
            return;
        }
        // users.email is unique across all rows (including soft-deleted ones and other roles), so
        // inserting over an existing row would crash startup. Leave it for an operator instead.
        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("No active admin exists, but {} already belongs to another account (deleted or non-admin). "
                    + "Default admin NOT created; set DEFAULT_ADMIN_EMAIL to an unused address or fix that row.", email);
            return;
        }

        log.info("No active admin account found in database. Initializing default admin: {}", email);
        if (BUILT_IN_DEFAULT_PASSWORD.equals(defaultPassword)) {
            // The admin portal has no forced first-login password change (that flow is student-only),
            // so mustChangePassword is not set; warn loudly instead.
            log.warn("The default admin was created with the BUILT-IN default password. "
                    + "Set DEFAULT_ADMIN_PASSWORD, or change this admin's password immediately.");
        }

        User adminUser = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(defaultPassword))
                .role(UserRole.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .build();
        adminUser = userRepository.save(adminUser);

        adminProfileRepository.save(AdminProfile.builder()
                .user(adminUser)
                .name(defaultName)
                .designation("Placement Officer")
                .build());

        log.info("Default admin account created successfully.");
    }
}
