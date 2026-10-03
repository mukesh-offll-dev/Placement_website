package com.gces.placementcell.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gces.placementcell.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response payload returned upon successful authentication.
 * Never exposes sensitive hashes or secrets.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponseDTO {

    private String token;
    private Long id;
    private String email;
    private UserRole role;
    private String fullName;
}
