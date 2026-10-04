package com.gces.placementcell;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.StudentAccountProvisioner;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StudentAccountProvisionerUnitTests {

    @Test
    void existingAccountWithDifferentPasswordIsNeverOverwritten() throws Exception {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        String currentHash = passwordEncoder.encode("the-existing-account-password");
        User existingAccount = User.builder()
            .email("student@example.edu")
            .passwordHash(currentHash)
            .role(UserRole.STUDENT)
            .accountStatus(AccountStatus.ACTIVE)
            .isActive(true)
            .isDeleted(false)
            .build();
        when(repository.findByEmail("student@example.edu")).thenReturn(Optional.of(existingAccount));

        var validatorFactory = Validation.buildDefaultValidatorFactory();
        try {
            StudentAccountProvisioner provisioner = new StudentAccountProvisioner(
                    repository,
                    passwordEncoder,
                    validatorFactory.getValidator(),
                    "student@example.edu",
                    "a-new-provisioning-password");

            assertThatThrownBy(() -> provisioner.run(new DefaultApplicationArguments(new String[0])))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Student account already exists; provisioning did not modify it");
            verify(repository, never()).save(any(User.class));
        } finally {
            validatorFactory.close();
        }
    }
}