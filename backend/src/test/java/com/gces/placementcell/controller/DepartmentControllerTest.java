package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.CreateDepartmentRequestDTO;
import com.gces.placementcell.dto.response.DepartmentResponseDTO;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.DepartmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Department Controller Tests")
class DepartmentControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockBean
        private DepartmentService departmentService;

        @Test
        @DisplayName("GET /departments should return departments with correct ID mapping and Mechatronics")
        void testGetAllDepartments() throws Exception {
                DepartmentResponseDTO itDept = DepartmentResponseDTO.builder()
                                .id(6L)
                                .name("Information Technology")
                                .code("IT")
                                .degree("B.Tech IT")
                                .build();

                DepartmentResponseDTO mechatronicsDept = DepartmentResponseDTO.builder()
                                .id(7L)
                                .name("Mechatronics")
                                .code("MCT")
                                .degree("B.E Mechatronics")
                                .build();

                when(departmentService.getAllDepartments()).thenReturn(List.of(itDept, mechatronicsDept));

                mockMvc.perform(get("/departments"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].id").value(6))
                                .andExpect(jsonPath("$.data[0].name").value("Information Technology"))
                                .andExpect(jsonPath("$.data[1].id").value(7))
                                .andExpect(jsonPath("$.data[1].name").value("Mechatronics"));
        }

        @Test
        @DisplayName("GET /departments/{id} for Mechatronics returns Mechatronics name")
        void testGetMechatronicsDepartmentById() throws Exception {
                DepartmentResponseDTO mechatronicsDept = DepartmentResponseDTO.builder()
                                .id(7L)
                                .name("Mechatronics")
                                .code("MCT")
                                .degree("B.E Mechatronics")
                                .build();

                when(departmentService.getDepartmentById(7L)).thenReturn(mechatronicsDept);

                mockMvc.perform(get("/departments/7"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.id").value(7))
                                .andExpect(jsonPath("$.data.name").value("Mechatronics"))
                                .andExpect(jsonPath("$.data.code").value("MCT"));
        }

        @Test
        @DisplayName("POST /departments creates a department successfully")
        void testCreateDepartmentSuccess() throws Exception {
                CreateDepartmentRequestDTO req = CreateDepartmentRequestDTO.builder()
                                .name("Mechatronics")
                                .code("MCT")
                                .degree("B.E Mechatronics")
                                .description("Robotics & Automation")
                                .build();

                DepartmentResponseDTO created = DepartmentResponseDTO.builder()
                                .id(7L)
                                .name("Mechatronics")
                                .code("MCT")
                                .degree("B.E Mechatronics")
                                .description("Robotics & Automation")
                                .build();

                when(departmentService.createDepartment(any(CreateDepartmentRequestDTO.class))).thenReturn(created);

                mockMvc.perform(post("/departments")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.name").value("Mechatronics"));
        }

        @Test
        @DisplayName("POST /departments with duplicate name triggers DuplicateResourceException")
        void testCreateDuplicateDepartmentFails() throws Exception {
                CreateDepartmentRequestDTO req = CreateDepartmentRequestDTO.builder()
                                .name("Mechatronics")
                                .code("MCT")
                                .build();

                when(departmentService.createDepartment(any(CreateDepartmentRequestDTO.class)))
                                .thenThrow(new DuplicateResourceException(
                                                "Department with name 'Mechatronics' already exists"));

                mockMvc.perform(post("/departments")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.message")
                                                .value("Department with name 'Mechatronics' already exists"));
        }
}
