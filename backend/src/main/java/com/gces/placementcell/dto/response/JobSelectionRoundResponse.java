package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.JobSelectionRound;
import com.gces.placementcell.entity.enums.DriveMode;

import java.time.LocalDate;

/** One round in a job's selection process. */
public record JobSelectionRoundResponse(
        Long id,
        Short roundNumber,
        String roundName,
        DriveMode roundMode,
        LocalDate scheduledOn
) {

    public static JobSelectionRoundResponse from(JobSelectionRound round) {
        if (round == null) {
            return null;
        }
        return new JobSelectionRoundResponse(
                round.getId(),
                round.getRoundNumber(),
                round.getRoundName(),
                round.getRoundMode(),
                round.getScheduledOn()
        );
    }
}
