package com.gces.placementcell.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StudentProfileUpdateRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 150) String degree,
        @Size(max = 200) String college,
        @Size(max = 20) String rollNo,
        @Size(max = 50) String phone,
        @Size(max = 500) String address,
        @Size(max = 3000) String about,
        @Size(max = 50) List<@NotBlank @Size(max = 60) String> skills,
        @Size(max = 30) List<@Valid EducationEntry> education,
        @Size(max = 30) List<@Valid ExperienceEntry> experience,
        @Size(max = 50) List<@Valid ProjectEntry> projects) {

    public record EducationEntry(
            @NotBlank @Size(max = 150) String college,
            @NotBlank @Size(max = 120) String degree,
            @NotBlank @Size(max = 40) String year,
            @Size(max = 40) String grade) {
    }

    public record ExperienceEntry(
            @NotBlank @Size(max = 120) String role,
            @NotBlank @Size(max = 150) String company,
            @NotBlank @Size(max = 80) String duration,
            @Size(max = 1500) String description) {
    }

    public record ProjectEntry(
            @NotBlank @Size(max = 150) String title,
            @Size(max = 2000) String desc,
            @Size(max = 30) List<@NotBlank @Size(max = 60) String> tech,
            @Size(max = 2048) String live,
            @Size(max = 2048) String repo) {
    }
}