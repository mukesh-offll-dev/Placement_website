package com.gces.placementcell.service;

import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/** A person's display name for any role: faculty/admin/student profile name, else the email. */
@Service
@RequiredArgsConstructor
public class UserDisplayNames {

    private final UserRepository userRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Transactional(readOnly = true)
    public String nameOf(User user) {
        if (user == null) {
            return null;
        }
        return switch (user.getRole()) {
            case FACULTY_ADVISOR -> facultyProfileRepository.findByUserId(user.getId())
                    .map(FacultyProfile::getFullName).orElse(user.getEmail());
            case STUDENT -> studentProfileRepository.findByUserId(user.getId())
                    .map(StudentProfile::getFullName).orElse(StudentIdentity.visibleEmail(user.getEmail()));
            default -> adminProfileRepository.findByUserId(user.getId())
                    .map(AdminProfile::getName).filter(n -> !n.isBlank()).orElse(user.getEmail());
        };
    }

    @Transactional(readOnly = true)
    public Map<Long, String> namesFor(Collection<Long> userIds) {
        Map<Long, String> names = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return names;
        }
        userRepository.findAllById(userIds).forEach(u -> names.put(u.getId(), nameOf(u)));
        return names;
    }
}
