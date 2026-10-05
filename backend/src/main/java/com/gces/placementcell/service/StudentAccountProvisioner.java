package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentProvisionRequest;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
public class StudentAccountProvisioner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final Validator validator;
    private final String email;
    private final String password;

    public StudentAccountProvisioner(
            UserRepository userRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            Validator validator,
            @Value("${STUDENT_PROVISION_EMAIL:}") String email,
            @Value("${STUDENT_PROVISION_PASSWORD:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() && password.isBlank()) {
            return;
        }
        if (email.isBlank() || password.isBlank()) {
            throw new IllegalStateException("Both student provisioning values must be provided");
        }

        StudentProvisionRequest request = new StudentProvisionRequest(email.trim(), password);
        if (!validator.validate(request).isEmpty()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("Student provisioning values do not meet validation requirements");
        }

        String normalizedEmail = request.email().toLowerCase(Locale.ROOT);
        var existingAccount = userRepository.findByEmail(normalizedEmail);
        if (existingAccount.isPresent()) {
                if (existingAccount.get().isStudent()
                    && existingAccount.get().isAccountActive()
                    && passwordEncoder.matches(password, existingAccount.get().getPasswordHash())) {
                return;
            }
            throw new IllegalStateException("Student account already exists; provisioning did not modify it");
        }

        userRepository.save(User.builder()
            .email(normalizedEmail)
            .passwordHash(passwordEncoder.encode(password))
            .role(UserRole.STUDENT)
            .accountStatus(AccountStatus.ACTIVE)
            .isActive(true)
            .isEmailVerified(false)
            .isDeleted(false)
            .build());
        System.out.println("Student account provisioned.");
    }
}