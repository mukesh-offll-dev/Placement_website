package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentSkill;
import com.gces.placementcell.entity.enums.SkillProficiency;

/** A skill claimed on a student's profile. */
public record StudentSkillResponse(
        Long id,
        String skillName,
        SkillProficiency proficiency
) {

    public static StudentSkillResponse from(StudentSkill skill) {
        if (skill == null) {
            return null;
        }
        return new StudentSkillResponse(skill.getId(), skill.getSkillName(), skill.getProficiency());
    }
}
