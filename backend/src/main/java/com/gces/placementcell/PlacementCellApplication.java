package com.gces.placementcell;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PlacementCellApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlacementCellApplication.class, args);
    }
}


