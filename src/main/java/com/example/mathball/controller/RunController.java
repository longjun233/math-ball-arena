package com.example.mathball.controller;

import com.example.mathball.model.dto.RunReport;
import com.example.mathball.service.RunService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/runs")
public class RunController {

    private final RunService runService;

    public RunController(RunService runService) {
        this.runService = runService;
    }

    @PostMapping
    public Map<String, Object> record(@RequestBody RunReport report) {
        return runService.record(report);
    }

    @GetMapping("/best")
    public Map<String, Object> best() {
        return runService.best();
    }
}
