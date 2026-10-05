package com.example.mathball.service;

import com.example.mathball.config.MathBallProperties;
import com.example.mathball.model.dto.LevelDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * 关卡服务测试：血量表达式实时解析、关内递增、关卡间不倒挂、限时反推。
 */
class LevelServiceTest {

    private MathBallProperties props;
    private LevelService service;

    @BeforeEach
    void setUp() {
        props = new MathBallProperties();
        service = new LevelService(props, new FormulaService());
    }

    private MathBallProperties.LevelSpec spec(int level, List<String> barriers, double speed) {
        MathBallProperties.LevelSpec s = new MathBallProperties.LevelSpec();
        s.setLevel(level);
        s.setBarriers(barriers);
        s.setSpikeSpeed(speed);
        return s;
    }

    @Test
    @DisplayName("血量表达式解析：纯数字与科学计数法")
    void parseExpressions() {
        assertEquals(BigInteger.ONE, LevelService.parseBarrierValue("1"));
        assertEquals(new BigInteger("50"), LevelService.parseBarrierValue("50"));
        assertEquals(new BigInteger("9158000000000000000000"), LevelService.parseBarrierValue("9.158e21"));
        assertEquals(BigInteger.TEN.pow(300), LevelService.parseBarrierValue("1e300"));
        assertEquals(new BigInteger("1344").multiply(BigInteger.TEN.pow(265)),
                LevelService.parseBarrierValue("1.344e268"));
    }

    @Test
    @DisplayName("第 9 关第 3 道屏障为 10^300（301 位十进制字符串）")
    void finalBarrierIsTenTo300() {
        props.setLevels(List.of(spec(9, List.of("1.344e268", "9.125e283", "1e300"), 38.2)));

        LevelDto dto = service.level(9);

        assertEquals(3, dto.barrierHp().size());
        assertEquals(301, dto.barrierHp().get(2).length());
        assertEquals(BigInteger.TEN.pow(300).toString(), dto.barrierHp().get(2));
    }

    @Test
    @DisplayName("第 1 关锚点：1 / 50 / 100")
    void firstLevelAnchor() {
        props.setLevels(List.of(spec(1, List.of("1", "50", "100"), 18)));

        LevelDto dto = service.level(1);

        assertEquals(List.of("1", "50", "100"), dto.barrierHp());
    }

    @Test
    @DisplayName("关内血量必须递增，否则拒绝启动")
    void rejectsNonIncreasing() {
        props.setLevels(List.of(spec(1, List.of("100", "50", "1"), 18)));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.level(1));
        assertEquals(true, ex.getMessage().contains("递增"));
    }

    @Test
    @DisplayName("关卡间不允许倒挂：27 道屏障必须全局严格递增")
    void rejectsCrossLevelInversion() {
        props.setLevels(List.of(
                spec(1, List.of("1", "50", "100"), 18),
                spec(2, List.of("10", "500", "1000"), 20))); // 第 2 关第 1 道 10 < 第 1 关第 3 道 100

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.allLevels());
        assertEquals(true, ex.getMessage().contains("倒挂"));
    }

    @Test
    @DisplayName("屏障数量必须恰好为 3")
    void rejectsWrongBarrierCount() {
        props.setLevels(List.of(spec(1, List.of("1", "50"), 18)));

        assertThrows(IllegalStateException.class, () -> service.level(1));
    }

    @Test
    @DisplayName("限时 = 尖刺行程 / 尖刺速度")
    void timeLimitDerivedFromSpeed() {
        props.setLevels(List.of(spec(1, List.of("1", "50", "100"), 70)));

        LevelDto dto = service.level(1);

        assertEquals(700.0 / 70.0, dto.timeLimitSec(), 1e-9);
        assertEquals(700, dto.spike().travel());
        assertEquals(70.0, dto.spike().speed(), 1e-9);
    }
}
