package com.gces.placementcell.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Lets slow work (sending email) run off the request thread, so posting a job never waits on SMTP,
 * and enables the scheduled profile reminders.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
