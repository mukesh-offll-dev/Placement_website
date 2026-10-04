package com.gces.placementcell.dto.response;

import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.EducationEntry;
import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.ExperienceEntry;
import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.ProjectEntry;

import java.math.BigDecimal;
import java.util.List;

public record StudentProfileResponse(
        String email,
        String name,
        String degree,
        String college,
        String rollNo,
        List<String> skills,
        String about,
        Contact contact,
        List<ExperienceEntry> experience,
        List<EducationEntry> education,
        List<ProjectEntry> projects,
        String placementStatus,
        Boolean openToOpportunities,
        BigDecimal cgpa,
        String department,
        Short semester) {

    public record Contact(String phone, String email, String address) {
    }
}