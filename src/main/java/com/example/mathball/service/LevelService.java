package com.example.mathball.service;

import com.example.mathball.config.MathBallProperties;
import com.example.mathball.model.BallFormula;
import com.example.mathball.model.dto.LevelDto;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * 关卡服务：把 levels.yml 里的「血量表达式」实时解析成 BigInteger，组装下发 DTO。
 *
 * <p>表达式支持：
 * <pre>
 *   "1"        -&gt; 1
 *   "50"       -&gt; 50
 *   "9.158e21" -&gt; 9158000000000000000000
 *   "1e300"    -&gt; 10^300
 * </pre>
 *
 * <p>所有血量都在启动时现算，配置文件里不出现任何大整数；改数值只需改表达式。
 */
@Service
public class LevelService {

    private static final int FORMULA_CHECK_SAMPLES = 4;
    private static final int BARRIERS_PER_LEVEL = 3;

    private final MathBallProperties props;
    private final FormulaService formulaService;

    public LevelService(MathBallProperties props, FormulaService formulaService) {
        this.props = props;
        this.formulaService = formulaService;
    }

    public List<LevelDto> allLevels() {
        List<LevelDto> dtos = props.getLevels().stream()
                .sorted(Comparator.comparingInt(MathBallProperties.LevelSpec::getLevel))
                .map(this::toDto)
                .collect(Collectors.toList());
        validateMonotonicAcrossLevels(dtos);
        return dtos;
    }

    public LevelDto level(int level) {
        return props.getLevels().stream()
                .filter(s -> s.getLevel() == level)
                .findFirst()
                .map(this::toDto)
                .orElseThrow(() -> new NoSuchElementException("关卡不存在: " + level));
    }

    public MathBallProperties.Physics physics() {
        return props.getPhysics();
    }

    public MathBallProperties.Transition transition() {
        return props.getTransition();
    }

    /** 解析血量表达式：纯整数，或尾数带小数的科学计数法。 */
    public static BigInteger parseBarrierValue(String expr) {
        if (expr == null) {
            throw new IllegalArgumentException("屏障血量表达式不能为空");
        }
        String s = expr.trim().toLowerCase().replace("_", "").replace(" ", "");
        if (s.isEmpty()) {
            throw new IllegalArgumentException("屏障血量表达式不能为空");
        }
        int eIdx = s.indexOf('e');
        if (eIdx < 0) {
            return new BigInteger(s);
        }
        String mantissaPart = s.substring(0, eIdx);
        int exponent = Integer.parseInt(s.substring(eIdx + 1));
        int dot = mantissaPart.indexOf('.');
        if (dot < 0) {
            return new BigInteger(mantissaPart).multiply(BigInteger.TEN.pow(exponent));
        }
        int decimals = mantissaPart.length() - dot - 1;
        BigInteger mantissa = new BigInteger(mantissaPart.replace(".", ""));
        int scaledExponent = exponent - decimals;
        if (scaledExponent >= 0) {
            return mantissa.multiply(BigInteger.TEN.pow(scaledExponent));
        }
        return mantissa.divide(BigInteger.TEN.pow(-scaledExponent));
    }

    private LevelDto toDto(MathBallProperties.LevelSpec spec) {
        List<String> expressions = spec.getBarriers();
        if (expressions == null || expressions.size() != BARRIERS_PER_LEVEL) {
            throw new IllegalStateException(
                    "第 " + spec.getLevel() + " 关的 barriers 必须恰好有 " + BARRIERS_PER_LEVEL + " 个值");
        }

        List<BigInteger> hp = new ArrayList<>(BARRIERS_PER_LEVEL);
        for (String expr : expressions) {
            hp.add(parseBarrierValue(expr));
        }
        for (int i = 0; i < hp.size(); i++) {
            if (hp.get(i).signum() <= 0) {
                throw new IllegalStateException(
                        "第 " + spec.getLevel() + " 关第 " + (i + 1) + " 道屏障血量必须为正数");
            }
            if (i > 0 && hp.get(i).compareTo(hp.get(i - 1)) <= 0) {
                throw new IllegalStateException("第 " + spec.getLevel() + " 关屏障血量必须递增");
            }
        }

        int travel = props.getPhysics().getSpikeTravel();
        double speed = spec.getSpikeSpeed();
        if (speed <= 0) {
            throw new IllegalStateException("第 " + spec.getLevel() + " 关尖刺速度必须为正数");
        }

        LevelDto.FormulaCheckDto check = formulaService.buildCheck(
                BallFormula.FACTORIAL, props.getPhysics().getBallStartN(), FORMULA_CHECK_SAMPLES);

        return new LevelDto(
                spec.getLevel(),
                hp.stream().map(BigInteger::toString).collect(Collectors.toList()),
                new LevelDto.SpikeDto(speed, travel),
                travel / speed,
                check);
    }

    /** 27 道屏障必须全局严格递增：后一关第 1 道要高于前一关第 3 道。 */
    private void validateMonotonicAcrossLevels(List<LevelDto> dtos) {
        BigInteger previous = null;
        for (LevelDto dto : dtos) {
            for (String hpText : dto.barrierHp()) {
                BigInteger hp = new BigInteger(hpText);
                if (previous != null && hp.compareTo(previous) <= 0) {
                    throw new IllegalStateException(
                            "第 " + dto.level() + " 关出现关卡间血量倒挂：屏障血量必须全局严格递增");
                }
                previous = hp;
            }
        }
    }
}
