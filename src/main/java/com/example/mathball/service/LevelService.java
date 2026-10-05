package com.example.mathball.service;

import com.example.mathball.config.MathBallProperties;
import com.example.mathball.model.BallFormula;
import com.example.mathball.model.Formulas;
import com.example.mathball.model.dto.LevelDto;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * 关卡服务：把 levels.yml 里的「血量指数」现算成 BigInteger，组装下发 DTO。
 */
@Service
public class LevelService {

    private static final int FORMULA_CHECK_SAMPLES = 4;

    private final MathBallProperties props;
    private final FormulaService formulaService;

    public LevelService(MathBallProperties props, FormulaService formulaService) {
        this.props = props;
        this.formulaService = formulaService;
    }

    public List<LevelDto> allLevels() {
        return props.getLevels().stream()
                .sorted(Comparator.comparingInt(MathBallProperties.LevelSpec::getLevel))
                .map(this::toDto)
                .collect(Collectors.toList());
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

    private LevelDto toDto(MathBallProperties.LevelSpec spec) {
        List<Integer> exponents = spec.getHpExponent();
        if (exponents == null || exponents.size() != 3) {
            throw new IllegalStateException(
                    "第 " + spec.getLevel() + " 关的 hp-exponent 必须恰好有 3 个值");
        }

        List<BigInteger> hp = new ArrayList<>(3);
        for (int e : exponents) {
            hp.add(Formulas.pow10(e));
        }
        // 不变量：同关内血量必须指数递增，且都是 10 的整数次幂
        for (int i = 0; i < hp.size(); i++) {
            if (!Formulas.isPowerOfTen(hp.get(i))) {
                throw new IllegalStateException("第 " + spec.getLevel() + " 关第 " + (i + 1) + " 道屏障血量不是 10 的整数次幂");
            }
            if (i > 0 && hp.get(i).compareTo(hp.get(i - 1)) <= 0) {
                throw new IllegalStateException("第 " + spec.getLevel() + " 关屏障血量未指数递增");
            }
        }

        int travel = props.getPhysics().getSpikeTravel();
        double speed = spec.getSpikeSpeed();
        double timeLimit = travel / speed;

        BallFormula ball = spec.getRecommendedBall();
        LevelDto.FormulaCheckDto check = formulaService.buildCheck(
                ball, props.getPhysics().getBallStartN(), FORMULA_CHECK_SAMPLES);

        return new LevelDto(
                spec.getLevel(),
                ball.name(),
                hp.stream().map(BigInteger::toString).collect(Collectors.toList()),
                new LevelDto.SpikeDto(speed, travel),
                timeLimit,
                check);
    }
}
