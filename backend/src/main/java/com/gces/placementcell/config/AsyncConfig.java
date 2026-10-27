package com.gces.placementcell.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Lets slow work (sending email) run off the request thread, so posting a job never waits on SMTP.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
