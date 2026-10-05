package com.example.mathball.model.dto;

/**
 * 战报。totalDamage 用十进制字符串传输（可能到 10^300 量级）。
 */
public record RunReport(
        String ball,
        int reachedLevel,
        int destroyedBarriers,
        boolean cleared,
        String totalDamage,
        String maxSingleDamage,
        long elapsedMs
) {
}
