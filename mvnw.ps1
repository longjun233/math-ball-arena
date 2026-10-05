# 项目本地 Maven 包装脚本
#
# 为什么需要它：
#   1. 本机 JAVA_HOME 曾指向 JDK 8，而 Spring Boot 3 需要 JDK 17+；
#   2. DSH 沙箱只允许写工作区，默认的 ~/.m2 仓库会被拒绝访问，
#      因此把本地仓库固定到项目内的 .m2repo/。
#
# 用法： .\mvnw.ps1 compile      /  .\mvnw.ps1 test  /  .\mvnw.ps1 spring-boot:run

$ErrorActionPreference = 'Stop'

# 1) 选一个 JDK 17+
$candidates = @($env:JAVA_HOME, 'C:\Java', 'C:\Program Files\Java\jdk-21', 'C:\Program Files\Java\jdk-17')
$jdk = $null
foreach ($c in $candidates) {
    if ($c -and (Test-Path (Join-Path $c 'bin\javac.exe'))) {
        $ver = & (Join-Path $c 'bin\javac.exe') -version 2>&1
        if ($ver -match 'javac (\d+)' -and [int]$Matches[1] -ge 17) { $jdk = $c; break }
    }
}
if (-not $jdk) {
    Write-Error '找不到 JDK 17+，请设置 JAVA_HOME 指向 JDK 17 或更高版本。'
    exit 1
}
$env:JAVA_HOME = $jdk

# 2) 本地仓库固定在工作区内，避免沙箱拒绝访问 ~/.m2
$repo = Join-Path $PSScriptRoot '.m2repo'

Write-Host "[mvnw] JAVA_HOME=$jdk"
Write-Host "[mvnw] repo=$repo"

& mvn "-Dmaven.repo.local=$repo" @args
exit $LASTEXITCODE
