package com.gces.placementcell.service;

import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves the signed-in faculty advisor and the student scope they are limited to. */
@Service
@RequiredArgsConstructor
public class FacultyContext {

    private final UserRepository userRepository;
    private final FacultyProfileRepository facultyProfileRepository;

    @Transactional(readOnly = true)
    public FacultyProfile current(UserDetails caller) {
        if (caller == null) {
            throw new AccessDeniedException("Faculty access only");
        }
        return userRepository.findByEmailAndIsDeletedFalse(caller.getUsername())
                .flatMap(user -> facultyProfileRepository.findByUserId(user.getId()))
                .orElseThrow(() -> new AccessDeniedException("No faculty profile for this account"));
    }

    /** The advisor's department scope; 403 "No department assigned" when they have none. */
    @Transactional(readOnly = true)
    public StudentScope scope(UserDetails caller) {
        FacultyProfile faculty = current(caller);
        if (faculty.getDepartment() == null) {
            throw new AccessDeniedException("No department assigned");
        }
        return StudentScope.faculty(faculty.getDepartment().getCode());
    }
}
