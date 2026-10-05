package com.example.mathball.model.dto;

import java.util.List;

/** 单关配置响应。血量以十进制字符串下发，避免 JSON number 精度丢失。 */
public record LevelDto(
        int level,
        String recommendedBall,
        List<String> barrierHp,
        SpikeDto spike,
        double timeLimitSec,
        FormulaCheckDto formulaCheck
) {
    public record SpikeDto(double speed, int travel) {
    }

    /** 前端启动自检用：该球种从起始阶数起连续 4 次撞击的伤害与累积值。 */
    public record FormulaCheckDto(
            String ball,
            int step,
            int startN,
            List<String> damage,
            List<String> cumulative
    ) {
    }
}
