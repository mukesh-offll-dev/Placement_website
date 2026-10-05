package com.gces.placementcell;

import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.StudentAccountProvisioner;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:provisioner-tests;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "STUDENT_PROVISION_EMAIL=provisioned@example.edu",
        "STUDENT_PROVISION_PASSWORD=a-secure-test-password"
})
class StudentAccountProvisionerTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private StudentAccountProvisioner provisioner;

    @Test
    void provisionsOnlyHashedPassword() {
        var account = userRepository.findByEmail("provisioned@example.edu").orElseThrow();

        assertThat(account.getPasswordHash()).isNotEqualTo("a-secure-test-password");
        assertThat(passwordEncoder.matches("a-secure-test-password", account.getPasswordHash())).isTrue();
        assertThat(account.getRole()).isEqualTo(UserRole.STUDENT);
    }

    @Test
    void repeatingProvisioningDoesNotChangeTheExistingPasswordHash() throws Exception {
        var before = userRepository.findByEmail("provisioned@example.edu").orElseThrow();
        String passwordHash = before.getPasswordHash();

        provisioner.run(new DefaultApplicationArguments(new String[0]));

        var after = userRepository.findByEmail("provisioned@example.edu").orElseThrow();
        assertThat(after.getPasswordHash()).isEqualTo(passwordHash);
    }
}