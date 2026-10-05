package com.example.mathball.controller;

import com.example.mathball.config.MathBallProperties;
import com.example.mathball.model.dto.LevelDto;
import com.example.mathball.service.LevelService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LevelController {

    private final LevelService levelService;

    public LevelController(LevelService levelService) {
        this.levelService = levelService;
    }

    /** 全部关卡配置 + 物理常量 + 过场配置。前端断网时用内置兜底配置。 */
    @GetMapping("/levels")
    public LevelsResponse levels() {
        return new LevelsResponse(
                levelService.allLevels(),
                levelService.physics(),
                levelService.transition());
    }

    @GetMapping("/levels/{n}")
    public LevelDto level(@PathVariable int n) {
        return levelService.level(n);
    }

    public record LevelsResponse(
            List<LevelDto> levels,
            MathBallProperties.Physics physics,
            MathBallProperties.Transition transition) {
    }
}
