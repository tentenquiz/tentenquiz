param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\social')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$cards = @(
    [pscustomobject]@{ Slug = 'en';    Subtitle = 'Everyday vocabulary in 12 languages';       Font = 'Arial';               Rtl = $false; Labels = @('seconds', 'questions', 'sections', 'stages') },
    [pscustomobject]@{ Slug = 'ko';    Subtitle = '12개 언어로 배우는 생활 단어';                   Font = 'Noto Sans KR';        Rtl = $false; Labels = @('초', '문제', '섹션', '스테이지') },
    [pscustomobject]@{ Slug = 'ja';    Subtitle = '12言語で学ぶ日常単語';                            Font = 'Yu Gothic';          Rtl = $false; Labels = @('秒', '問', 'セクション', 'ステージ') },
    [pscustomobject]@{ Slug = 'zh-cn'; Subtitle = '用12种语言学习生活词汇';                           Font = 'Microsoft YaHei';    Rtl = $false; Labels = @('秒', '题', '类别', '阶段') },
    [pscustomobject]@{ Slug = 'zh-tw'; Subtitle = '用12種語言學習生活詞彙';                           Font = 'Microsoft JhengHei'; Rtl = $false; Labels = @('秒', '題', '類別', '階段') },
    [pscustomobject]@{ Slug = 'fr';    Subtitle = 'Le vocabulaire quotidien en 12 langues';    Font = 'Arial';               Rtl = $false; Labels = @('secondes', 'questions', 'sections', 'niveaux') },
    [pscustomobject]@{ Slug = 'de';    Subtitle = 'Alltagswortschatz in 12 Sprachen';           Font = 'Arial';               Rtl = $false; Labels = @('Sekunden', 'Fragen', 'Bereiche', 'Stufen') },
    [pscustomobject]@{ Slug = 'es';    Subtitle = 'Vocabulario cotidiano en 12 idiomas';        Font = 'Arial';               Rtl = $false; Labels = @('segundos', 'preguntas', 'secciones', 'etapas') },
    [pscustomobject]@{ Slug = 'vi';    Subtitle = 'Từ vựng hằng ngày bằng 12 ngôn ngữ';          Font = 'Arial';               Rtl = $false; Labels = @('giây', 'câu hỏi', 'chủ đề', 'cấp độ') },
    [pscustomobject]@{ Slug = 'ar';    Subtitle = 'مفردات يومية بـ 12 لغة';                       Font = 'Tahoma';              Rtl = $true;  Labels = @('ثوانٍ', 'أسئلة', 'أقسام', 'مراحل') },
    [pscustomobject]@{ Slug = 'it';    Subtitle = 'Vocabolario quotidiano in 12 lingue';        Font = 'Arial';               Rtl = $false; Labels = @('secondi', 'domande', 'sezioni', 'livelli') },
    [pscustomobject]@{ Slug = 'ru';    Subtitle = 'Повседневные слова на 12 языках';             Font = 'Arial';               Rtl = $false; Labels = @('секунд', 'вопросов', 'разделов', 'этапов') }
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

            $metricX = 128
            $metricY = 335
            $metricWidth = 214
            $metricGap = 16
            $numberBrush = [System.Drawing.SolidBrush]::new($gold)
            try {
                for ($index = 0; $index -lt 4; $index++) {
                    $x = $metricX + (($metricWidth + $metricGap) * $index)
                    $numberFont = [System.Drawing.Font]::new('Arial', 82, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                    $metricFormat = [System.Drawing.StringFormat]::new()
                    try {
                        $metricFormat.Alignment = [System.Drawing.StringAlignment]::Center
                        $metricFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                        $graphics.DrawString('10', $numberFont, $numberBrush, [System.Drawing.RectangleF]::new($x, $metricY - 10, $metricWidth, 106), $metricFormat)
                    } finally { $metricFormat.Dispose(); $numberFont.Dispose() }

                    $label = [string]$card.Labels[$index]
                    $labelFont = New-FittedFont $graphics $label $card.Font 34 ($metricWidth - 16) ([System.Drawing.FontStyle]::Bold) 22
                    $labelFormat = [System.Drawing.StringFormat]::new()
                    try {
                        $labelFormat.Alignment = [System.Drawing.StringAlignment]::Center
                        $labelFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                        if ($card.Rtl) { $labelFormat.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft }
                        $graphics.DrawString($label, $labelFont, $creamBrush, [System.Drawing.RectangleF]::new($x + 8, $metricY + 91, $metricWidth - 16, 54), $labelFormat)
                    } finally { $labelFormat.Dispose(); $labelFont.Dispose() }

                    if ($index -lt 3) {
                        $separatorFont = [System.Drawing.Font]::new('Arial', 42, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                        $separatorFormat = [System.Drawing.StringFormat]::new()
                        try {
                            $separatorFormat.Alignment = [System.Drawing.StringAlignment]::Center
                            $separatorFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                            $separatorX = $x + $metricWidth + (($metricGap - 26) / 2)
                            $graphics.DrawString('·', $separatorFont, $numberBrush, [System.Drawing.RectangleF]::new($separatorX, $metricY + 34, 26, 52), $separatorFormat)
                        } finally { $separatorFormat.Dispose(); $separatorFont.Dispose() }
                    }
                }
            } finally { $numberBrush.Dispose() }

            $subtitleFont = New-FittedFont $graphics $card.Subtitle $card.Font 36 900 ([System.Drawing.FontStyle]::Bold) 29
            $subtitleFormat = [System.Drawing.StringFormat]::new()
            $subtitleBrush = [System.Drawing.SolidBrush]::new($gold)
            try {
                $subtitleFormat.Alignment = [System.Drawing.StringAlignment]::Near
                $subtitleFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                if ($card.Rtl) { $subtitleFormat.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft }
                $graphics.DrawString($card.Subtitle, $subtitleFont, $subtitleBrush, [System.Drawing.RectangleF]::new(128, 536, 906, 54), $subtitleFormat)
            } finally { $subtitleBrush.Dispose(); $subtitleFormat.Dispose(); $subtitleFont.Dispose() }
        } finally { $creamBrush.Dispose() }

        $file = Join-Path $outputPath ("og-image-{0}.png" -f $card.Slug)
        $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host ("OK: {0}" -f $file)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
