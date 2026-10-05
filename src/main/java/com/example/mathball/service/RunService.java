package com.example.mathball.service;

import com.example.mathball.model.dto.RunReport;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 战报服务（v1 内存存储，重启即清）。后续可替换为 H2 / MySQL，接口不变。
 */
@Service
public class RunService {

    private final AtomicLong sequence = new AtomicLong();
    private final List<RunReport> runs = new ArrayList<>();

    public synchronized Map<String, Object> record(RunReport report) {
        long id = sequence.incrementAndGet();
        runs.add(report);
        boolean best = runs.stream()
                .max(Comparator.comparingInt(RunReport::reachedLevel))
                .map(r -> r == report)
                .orElse(false);
        return Map.of("id", id, "best", best);
    }

    public synchronized Map<String, Object> best() {
        int maxLevel = runs.stream().mapToInt(RunReport::reachedLevel).max().orElse(0);
        long bestTime = runs.stream()
                .filter(RunReport::cleared)
                .mapToLong(RunReport::elapsedMs)
                .min()
                .orElse(0L);
        return Map.of("maxLevel", maxLevel, "bestTimeMs", bestTime, "totalRuns", runs.size());
    }
}
