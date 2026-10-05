package com.example.mathball.model.dto;

/** 公式球清单项。step 是该球种固定的升阶步长，玩家不可调整。 */
public record BallDto(
        String code,
        String name,
        String formula,
        int step,
        int stars,
        boolean unlocked
) {
}
