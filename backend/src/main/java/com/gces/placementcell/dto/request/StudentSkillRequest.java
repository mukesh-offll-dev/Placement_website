package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.SkillProficiency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentSkillRequest(
        @NotBlank(message = "Skill name is required")
        @Size(max = 60, message = "Skill name cannot exceed 60 characters")
        String skillName,

        SkillProficiency proficiency
) {
    public StudentSkillRequest(String skillName) {
        this(skillName, SkillProficiency.INTERMEDIATE);
    }
}

