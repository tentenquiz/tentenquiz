param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\social')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$cards = @(
    [pscustomobject]@{ Slug = 'en';    Subtitle = 'Everyday vocabulary in 12 languages';       Font = 'Arial';               Rtl = $false; Labels = @('seconds', 'questions') },
    [pscustomobject]@{ Slug = 'ko';    Subtitle = '12개 언어로 배우는 생활 단어';                   Font = 'Noto Sans KR';        Rtl = $false; Labels = @('초', '문제') },
    [pscustomobject]@{ Slug = 'ja';    Subtitle = '12言語で学ぶ日常単語';                            Font = 'Yu Gothic';          Rtl = $false; Labels = @('秒', '問') },
    [pscustomobject]@{ Slug = 'zh-cn'; Subtitle = '用12种语言学习生活词汇';                           Font = 'Microsoft YaHei';    Rtl = $false; Labels = @('秒', '题') },
    [pscustomobject]@{ Slug = 'zh-tw'; Subtitle = '用12種語言學習生活詞彙';                           Font = 'Microsoft JhengHei'; Rtl = $false; Labels = @('秒', '題') },
    [pscustomobject]@{ Slug = 'fr';    Subtitle = 'Le vocabulaire quotidien en 12 langues';    Font = 'Arial';               Rtl = $false; Labels = @('secondes', 'questions') },
    [pscustomobject]@{ Slug = 'de';    Subtitle = 'Alltagswortschatz in 12 Sprachen';           Font = 'Arial';               Rtl = $false; Labels = @('Sekunden', 'Fragen') },
    [pscustomobject]@{ Slug = 'es';    Subtitle = 'Vocabulario cotidiano en 12 idiomas';        Font = 'Arial';               Rtl = $false; Labels = @('segundos', 'preguntas') },
    [pscustomobject]@{ Slug = 'vi';    Subtitle = 'Từ vựng hằng ngày bằng 12 ngôn ngữ';          Font = 'Arial';               Rtl = $false; Labels = @('giây', 'câu hỏi') },
    [pscustomobject]@{ Slug = 'ar';    Subtitle = 'مفردات يومية بـ 12 لغة';                       Font = 'Tahoma';              Rtl = $true;  Labels = @('ثوانٍ', 'أسئلة') },
    [pscustomobject]@{ Slug = 'it';    Subtitle = 'Vocabolario quotidiano in 12 lingue';        Font = 'Arial';               Rtl = $false; Labels = @('secondi', 'domande') },
    [pscustomobject]@{ Slug = 'ru';    Subtitle = 'Повседневные слова на 12 языках';             Font = 'Arial';               Rtl = $false; Labels = @('секунд', 'вопросов') }
)

function New-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$Rectangle,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-FittedFont {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Text,
        [string]$Family,
        [float]$PreferredSize,
        [float]$MaximumWidth,
        [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular,
        [float]$MinimumSize = 24
    )

    $size = $PreferredSize
    while ($size -ge $MinimumSize) {
        $font = [System.Drawing.Font]::new($Family, $size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
        if ($Graphics.MeasureString($Text, $font).Width -le $MaximumWidth) {
            return $font
        }
        $font.Dispose()
        $size -= 1
    }
    return [System.Drawing.Font]::new($Family, $MinimumSize, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

$backgroundTop = [System.Drawing.Color]::FromArgb(124, 33, 33)
$backgroundBottom = [System.Drawing.Color]::FromArgb(159, 47, 47)
$cream = [System.Drawing.Color]::FromArgb(255, 247, 240)
$gold = [System.Drawing.Color]::FromArgb(240, 198, 116)

foreach ($card in $cards) {
    $bitmap = [System.Drawing.Bitmap]::new(1200, 630, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

        $canvas = [System.Drawing.Rectangle]::new(0, 0, 1200, 630)
        $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new($canvas, $backgroundTop, $backgroundBottom, 90.0)
        try { $graphics.FillRectangle($background, $canvas) } finally { $background.Dispose() }

        $accentPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(80, 112, 13, 154)) 6.5
        $goldBrush = [System.Drawing.SolidBrush]::new($gold)
        try { $graphics.FillPath($goldBrush, $accentPath) } finally { $goldBrush.Dispose(); $accentPath.Dispose() }

        $creamBrush = [System.Drawing.SolidBrush]::new($cream)
        try {
            $titleFont = [System.Drawing.Font]::new('Arial', 130, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            try { $graphics.DrawString('TentenQuiz', $titleFont, $creamBrush, 119, 116) } finally { $titleFont.Dispose() }

            # Center the content-width pair as one group, including a fixed gap.
            $metricGap = 40
            $baseline = 407
            $numberFont = [System.Drawing.Font]::new('Arial', 110, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $labelFont = [System.Drawing.Font]::new($card.Font, 61, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $numberBrush = [System.Drawing.SolidBrush]::new($gold)
            $inlineFormat = [System.Drawing.StringFormat]::GenericTypographic.Clone()
            $labelFormat = [System.Drawing.StringFormat]::GenericTypographic.Clone()
            try {
                $inlineFormat.FormatFlags = $inlineFormat.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
                $labelFormat.FormatFlags = $labelFormat.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
                if ($card.Rtl) { $labelFormat.FormatFlags = $labelFormat.FormatFlags -bor [System.Drawing.StringFormatFlags]::DirectionRightToLeft }
                $numberWidth = $graphics.MeasureString('10', $numberFont, 2000, $inlineFormat).Width
                $numberAscent = $numberFont.Size * $numberFont.FontFamily.GetCellAscent($numberFont.Style) / $numberFont.FontFamily.GetEmHeight($numberFont.Style)
                $labelAscent = $labelFont.Size * $labelFont.FontFamily.GetCellAscent($labelFont.Style) / $labelFont.FontFamily.GetEmHeight($labelFont.Style)
                $wordGap = if ($card.Slug -in @('ko', 'ja', 'zh-cn', 'zh-tw')) { 2 } else { 12 }
                $labelWidths = @($card.Labels | ForEach-Object {
                    $graphics.MeasureString([string]$_, $labelFont, 2000, $labelFormat).Width
                })
                $messageWidths = @($labelWidths | ForEach-Object { $numberWidth + $wordGap + $_ })
                $groupWidth = $messageWidths[0] + $metricGap + $messageWidths[1]
                if ($groupWidth -gt 960) { throw "Inline group overflows: $($card.Slug)" }
                $left = (1200 - $groupWidth) / 2
                for ($index = 0; $index -lt 2; $index++) {
                    $label = [string]$card.Labels[$index]
                    $labelWidth = $labelWidths[$index]
                    $numberX = $left
                    $labelX = $left + $numberWidth + $wordGap
                    if ($card.Rtl) {
                        $numberX = $left + $labelWidth + $wordGap
                        # RTL point alignment uses the right edge of the label run.
                        $labelX = $left + $labelWidth
                    }
                    $graphics.DrawString('10', $numberFont, $numberBrush, [System.Drawing.PointF]::new($numberX, $baseline - $numberAscent), $inlineFormat)
                    $graphics.DrawString($label, $labelFont, $creamBrush, [System.Drawing.PointF]::new($labelX, $baseline - $labelAscent), $labelFormat)
                    $left += $messageWidths[$index] + $metricGap
                }
            } finally { $labelFormat.Dispose(); $inlineFormat.Dispose(); $numberBrush.Dispose(); $numberFont.Dispose(); $labelFont.Dispose() }

            $subtitleFont = New-FittedFont $graphics $card.Subtitle $card.Font 36 900 ([System.Drawing.FontStyle]::Bold) 29
            $subtitleFormat = [System.Drawing.StringFormat]::new()
            $subtitleBrush = [System.Drawing.SolidBrush]::new($gold)
            try {
                $subtitleFormat.Alignment = [System.Drawing.StringAlignment]::Center
                $subtitleFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                if ($card.Rtl) { $subtitleFormat.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft }
                $graphics.DrawString($card.Subtitle, $subtitleFont, $subtitleBrush, [System.Drawing.RectangleF]::new(132, 530, 936, 54), $subtitleFormat)
            } finally { $subtitleBrush.Dispose(); $subtitleFormat.Dispose(); $subtitleFont.Dispose() }
        } finally { $creamBrush.Dispose() }

        $file = Join-Path $outputPath ("og-image-{0}.png" -f $card.Slug)
        $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
        if ($card.Slug -eq 'en') {
            $bitmap.Save((Join-Path $outputPath 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        }
        Write-Host ("OK: {0}" -f $file)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
