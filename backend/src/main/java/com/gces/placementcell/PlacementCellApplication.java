package com.gces.placementcell;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PlacementCellApplication {

    public static void main(String[] args) {
        // HikariCP re-checks any connection idle for more than 500 ms before handing it out,
        // which costs a full network round trip per request on a remote database. Pooled
        // connections are recycled well inside the database's idle limit (max-lifetime), so
        // trust them for 30 s instead. Must be set before Hikari's classes load.
        System.setProperty("com.zaxxer.hikari.aliveBypassWindowMs", "30000");
        SpringApplication.run(PlacementCellApplication.class, args);
    }
}


