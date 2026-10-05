package com.example.mathball.controller;

import com.example.mathball.model.BallFormula;
import com.example.mathball.model.dto.BallDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
public class BallController {

    /**
     * 公式球清单。v1 三种球全部解锁；解锁机制留作后续扩展点。
     */
    @GetMapping("/balls")
    public List<BallDto> balls() {
        return Arrays.stream(BallFormula.values())
                .map(b -> new BallDto(
                        b.name(),
                        b.getDisplayName(),
                        b.getFormulaText(),
                        b.getStep(),
                        b.getStars(),
                        true))
                .toList();
    }
}
