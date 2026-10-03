package com.gces.placementcell.config;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@Profile("dev")
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            // Student 1: Adithya K / Alex Harrison
            User user1 = userRepository.save(User.builder()
                    .email("adithya.k@gce.edu.in")
                    .passwordHash(passwordEncoder.encode("password123"))
                    .role(UserRole.STUDENT)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build());

            studentProfileRepository.save(StudentProfile.builder()
                    .user(user1)
                    .rollNo("220CSE001")
                    .fullName("Adithya K")
                    .email("adithya.k@gce.edu.in")
                    .phone("+91 98765 00001")
                    .address("Trichy")
                    .college("Government College of Engineering, Srirangam")
                    .degree("B.E Computer Science and Engineering")
                    .department("Computer Science (CSE)")
                    .departmentCode("CSE")
                    .batch("2022-2026")
                    .semester(7)
                    .cgpa(new BigDecimal("8.92"))
                    .placementStatus(PlacementStatus.PLACED)
                    .about("Passionate full-stack developer with expertise in React and Node.js.")
                    .profileCompletionPercent(95)
                    .build());

            // Student 2: Priya M
            User user2 = userRepository.save(User.builder()
                    .email("priya.m@gce.edu.in")
                    .passwordHash(passwordEncoder.encode("password123"))
                    .role(UserRole.STUDENT)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build());

            studentProfileRepository.save(StudentProfile.builder()
                    .user(user2)
                    .rollNo("220ECE002")
                    .fullName("Priya M")
                    .email("priya.m@gce.edu.in")
                    .phone("+91 98765 00002")
                    .address("Chennai")
                    .college("Government College of Engineering, Srirangam")
                    .degree("B.E Electronics and Communication Engineering")
                    .department("Electronics (ECE)")
                    .departmentCode("ECE")
                    .batch("2022-2026")
                    .semester(7)
                    .cgpa(new BigDecimal("7.50"))
                    .placementStatus(PlacementStatus.ACTIVE)
                    .about("Electronics and embedded systems enthusiast with VLSI design experience.")
                    .profileCompletionPercent(100)
                    .build());

            // Student 3: Rahul S
            User user3 = userRepository.save(User.builder()
                    .email("rahul.s@gce.edu.in")
                    .passwordHash(passwordEncoder.encode("password123"))
                    .role(UserRole.STUDENT)
                    .accountStatus(AccountStatus.ACTIVE)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build());

            studentProfileRepository.save(StudentProfile.builder()
                    .user(user3)
                    .rollNo("223MECH003")
                    .fullName("Rahul S")
                    .email("rahul.s@gce.edu.in")
                    .phone("+91 98765 00003")
                    .address("Coimbatore")
                    .college("Government College of Engineering, Srirangam")
                    .degree("B.E Mechanical Engineering")
                    .department("Mechanical (MECH)")
                    .departmentCode("MECH")
                    .batch("2023-2027")
                    .semester(5)
                    .cgpa(new BigDecimal("8.10"))
                    .placementStatus(PlacementStatus.PENDING)
                    .about("Mechanical engineering student interested in automotive and robotics.")
                    .profileCompletionPercent(65)
                    .build());
        }
    }
}
