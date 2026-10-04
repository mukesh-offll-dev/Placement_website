package com.gces.placementcell.dto.response;

public record AuthTokenResponse(String accessToken, String tokenType, long expiresIn) {

	@Override
	public String toString() {
		return "AuthTokenResponse[accessToken=[REDACTED], tokenType=" + tokenType
				+ ", expiresIn=" + expiresIn + "]";
	}
}