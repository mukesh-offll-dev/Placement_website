package com.gces.placementcell.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class JobServiceCtcTextTest {

    @Test
    void rupeesAreShownInLakhs() {
        assertEquals("6.5 LPA", JobService.formatCtcText(new BigDecimal("650000")));
        assertEquals("24 LPA", JobService.formatCtcText(new BigDecimal("2400000.00")));
        assertEquals("12.35 LPA", JobService.formatCtcText(new BigDecimal("1234567")));
    }

    @Test
    void smallValuesAreAlreadyLakhs() {
        assertEquals("6.5 LPA", JobService.formatCtcText(new BigDecimal("6.5")));
    }

    @Test
    void missingOrZeroGivesNoLabel() {
        assertNull(JobService.formatCtcText(null));
        assertNull(JobService.formatCtcText(BigDecimal.ZERO));
    }
}
