package com.gces.placementcell.config;

import com.gces.placementcell.entity.Department;
import com.gces.placementcell.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gives a new database its starting departments. It only acts when the table is empty, so once an
 * admin owns the list, a department they delete does not come back on the next restart. (Codes that
 * students already carry are added separately by DepartmentService, whenever the list is read.)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DepartmentSeeder implements ApplicationRunner {

    private static final List<String[]> STARTING_SET = List.of(
            new String[]{"CSE", "Computer Science and Engineering"},
            new String[]{"ECE", "Electronics and Communication Engineering"},
            new String[]{"EEE", "Electrical and Electronics Engineering"},
            new String[]{"CIVIL", "Civil Engineering"},
            new String[]{"MECH", "Mechanical Engineering"},
            new String[]{"MCT", "Mechatronics Engineering"});

    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (departmentRepository.count() > 0) {
            return;
        }
        for (String[] row : STARTING_SET) {
            departmentRepository.save(Department.builder().code(row[0]).name(row[1]).build());
        }
        log.info("Seeded {} starting departments.", STARTING_SET.size());
    }
}
