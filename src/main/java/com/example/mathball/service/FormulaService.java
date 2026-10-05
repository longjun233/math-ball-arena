package com.example.mathball.service;

import com.example.mathball.model.BallFormula;
import com.example.mathball.model.dto.LevelDto;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

/**
 * 公式求值服务。全部运算走 BigInteger，禁止 long / double 参与伤害与血量计算。
 */
@Service
public class FormulaService {

    /** 单次碰撞伤害：先升阶，再结算。 */
    public BigInteger damage(BallFormula ball, int n) {
        return ball.value(n);
    }

    /** 累积伤害：从起始阶数起连续 count 次撞击的总伤害。 */
    public BigInteger cumulative(BallFormula ball, int startN, int count) {
        BigInteger sum = BigInteger.ZERO;
        int n = startN;
        for (int i = 0; i < count; i++) {
            n += ball.getStep();
            sum = sum.add(ball.value(n));
        }
        return sum;
    }

    /**
     * 生成前端启动自检数据：该球种从起始阶数起连续 count 次撞击的伤害与累积值。
     * 前端用相同规则本地重算，不一致即告警，防止前后端公式实现漂移。
     */
    public LevelDto.FormulaCheckDto buildCheck(BallFormula ball, int startN, int count) {
        List<String> damages = new ArrayList<>(count);
        List<String> cumulatives = new ArrayList<>(count);
        BigInteger sum = BigInteger.ZERO;
        int n = startN;
        for (int i = 0; i < count; i++) {
            n += ball.getStep();
            BigInteger d = ball.value(n);
            sum = sum.add(d);
            damages.add(d.toString());
            cumulatives.add(sum.toString());
        }
        return new LevelDto.FormulaCheckDto(ball.name(), ball.getStep(), startN, damages, cumulatives);
    }
}
