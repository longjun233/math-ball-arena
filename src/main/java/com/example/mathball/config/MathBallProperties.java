package com.example.mathball.config;

import com.example.mathball.model.BallFormula;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 所有可调参数集中于此，来自 application.yml + levels.yml。
 * 前端不得硬编码这些值，必须由 /api/levels 下发。
 */
@Component
@ConfigurationProperties(prefix = "mathball")
public class MathBallProperties {

    private Physics physics = new Physics();
    private Transition transition = new Transition();
    private List<LevelSpec> levels = new ArrayList<>();

    public Physics getPhysics() {
        return physics;
    }

    public void setPhysics(Physics physics) {
        this.physics = physics;
    }

    public Transition getTransition() {
        return transition;
    }

    public void setTransition(Transition transition) {
        this.transition = transition;
    }

    public List<LevelSpec> getLevels() {
        return levels;
    }

    public void setLevels(List<LevelSpec> levels) {
        this.levels = levels;
    }

    /** 物理常量。改这里必须重跑 tools/balance-calc.mjs。 */
    public static class Physics {
        private int canvasWidth = 900;
        private int canvasHeight = 760;
        private double gravity = 2400;
        private double bounceSpeed = 420;
        private double vxMin = 40;
        private double vxMax = 160;
        private int barrierGap = 110;
        private int barrierHeight = 16;
        private List<Integer> barrierTopY = List.of(390, 500, 610);
        private int safeZoneTop = 670;
        private int ballRadius = 16;
        private int ballStartY = 100;
        private int ballStartN = 2;
        private int spikeHeight = 60;
        private int spikeTravel = 700;
        private double fixedStepSec = 1.0 / 120.0;

        public int getCanvasWidth() { return canvasWidth; }
        public void setCanvasWidth(int canvasWidth) { this.canvasWidth = canvasWidth; }
        public int getCanvasHeight() { return canvasHeight; }
        public void setCanvasHeight(int canvasHeight) { this.canvasHeight = canvasHeight; }
        public double getGravity() { return gravity; }
        public void setGravity(double gravity) { this.gravity = gravity; }
        public double getBounceSpeed() { return bounceSpeed; }
        public void setBounceSpeed(double bounceSpeed) { this.bounceSpeed = bounceSpeed; }
        public double getVxMin() { return vxMin; }
        public void setVxMin(double vxMin) { this.vxMin = vxMin; }
        public double getVxMax() { return vxMax; }
        public void setVxMax(double vxMax) { this.vxMax = vxMax; }
        public int getBarrierGap() { return barrierGap; }
        public void setBarrierGap(int barrierGap) { this.barrierGap = barrierGap; }
        public int getBarrierHeight() { return barrierHeight; }
        public void setBarrierHeight(int barrierHeight) { this.barrierHeight = barrierHeight; }
        public List<Integer> getBarrierTopY() { return barrierTopY; }
        public void setBarrierTopY(List<Integer> barrierTopY) { this.barrierTopY = barrierTopY; }
        public int getSafeZoneTop() { return safeZoneTop; }
        public void setSafeZoneTop(int safeZoneTop) { this.safeZoneTop = safeZoneTop; }
        public int getBallRadius() { return ballRadius; }
        public void setBallRadius(int ballRadius) { this.ballRadius = ballRadius; }
        public int getBallStartY() { return ballStartY; }
        public void setBallStartY(int ballStartY) { this.ballStartY = ballStartY; }
        public int getBallStartN() { return ballStartN; }
        public void setBallStartN(int ballStartN) { this.ballStartN = ballStartN; }
        public int getSpikeHeight() { return spikeHeight; }
        public void setSpikeHeight(int spikeHeight) { this.spikeHeight = spikeHeight; }
        public int getSpikeTravel() { return spikeTravel; }
        public void setSpikeTravel(int spikeTravel) { this.spikeTravel = spikeTravel; }
        public double getFixedStepSec() { return fixedStepSec; }
        public void setFixedStepSec(double fixedStepSec) { this.fixedStepSec = fixedStepSec; }
    }

    /** 关卡间过场：0.6s 关卡号闪现，不是结算界面。 */
    public static class Transition {
        private boolean enabled = true;
        private int durationMs = 600;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public int getDurationMs() { return durationMs; }
        public void setDurationMs(int durationMs) { this.durationMs = durationMs; }
    }

    /** 单关配置：只写血量指数与尖刺速度，BigInteger 血量由 LevelService 现算。 */
    public static class LevelSpec {
        private int level;
        private BallFormula recommendedBall = BallFormula.FACTORIAL;
        private List<Integer> hpExponent = new ArrayList<>();
        private double spikeSpeed;

        public int getLevel() { return level; }
        public void setLevel(int level) { this.level = level; }
        public BallFormula getRecommendedBall() { return recommendedBall; }
        public void setRecommendedBall(BallFormula recommendedBall) { this.recommendedBall = recommendedBall; }
        public List<Integer> getHpExponent() { return hpExponent; }
        public void setHpExponent(List<Integer> hpExponent) { this.hpExponent = hpExponent; }
        public double getSpikeSpeed() { return spikeSpeed; }
        public void setSpikeSpeed(double spikeSpeed) { this.spikeSpeed = spikeSpeed; }
    }
}
