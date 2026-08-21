param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\social')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$cards = @(
    [pscustomobject]@{ Slug = 'en';    Text = '10-second vocabulary quizzes in 12 languages';       Font = 'Arial';                Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'ko';    Text = '12개 언어로 즐기는 10초 단어 퀴즈';                    Font = 'Noto Sans KR';         Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'ja';    Text = '12言語で楽しむ10秒単語クイズ';                         Font = 'Yu Gothic';           Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'zh-cn'; Text = '用12种语言挑战10秒词汇测验';                            Font = 'Microsoft YaHei';     Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'zh-tw'; Text = '用12種語言挑戰10秒詞彙測驗';                            Font = 'Microsoft JhengHei';  Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'fr';    Text = 'Quiz de vocabulaire en 10 secondes, en 12 langues'; Font = 'Arial';                Size = 38; Rtl = $false },
    [pscustomobject]@{ Slug = 'de';    Text = '10-Sekunden-Wortquiz in 12 Sprachen';                Font = 'Arial';                Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'es';    Text = 'Quiz de vocabulario de 10 segundos en 12 idiomas';  Font = 'Arial';                Size = 38; Rtl = $false },
    [pscustomobject]@{ Slug = 'vi';    Text = 'Quiz từ vựng 10 giây bằng 12 ngôn ngữ';              Font = 'Arial';                Size = 40; Rtl = $false },
    [pscustomobject]@{ Slug = 'ar';    Text = 'اختبار مفردات من 10 ثوانٍ بـ 12 لغة';                 Font = 'Tahoma';               Size = 40; Rtl = $true  },
    [pscustomobject]@{ Slug = 'it';    Text = 'Quiz di vocaboli in 10 secondi, in 12 lingue';      Font = 'Arial';                Size = 39; Rtl = $false },
    [pscustomobject]@{ Slug = 'ru';    Text = '10-секундная викторина по словам на 12 языках';     Font = 'Arial';                Size = 38; Rtl = $false }
)

$chips = @(
    [pscustomobject]@{ Text = '한국어';   X = 128; Width = 128; Font = 'Noto Sans KR' },
    [pscustomobject]@{ Text = 'English'; X = 270; Width = 149; Font = 'Arial' },
    [pscustomobject]@{ Text = '日本語';   X = 433; Width = 134; Font = 'Yu Gothic' },
    [pscustomobject]@{ Text = '中文';     X = 581; Width = 105; Font = 'Microsoft YaHei' },
    [pscustomobject]@{ Text = 'Français'; X = 700; Width = 162; Font = 'Arial' },
    [pscustomobject]@{ Text = 'Español'; X = 876; Width = 158; Font = 'Arial' }
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
        [float]$MaximumWidth
    )

    $size = $PreferredSize
    while ($size -ge 30) {
        $font = [System.Drawing.Font]::new($Family, $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        if ($Graphics.MeasureString($Text, $font).Width -le $MaximumWidth) {
            return $font
        }
        $font.Dispose()
        $size -= 1
    }
    return [System.Drawing.Font]::new($Family, 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

$backgroundTop = [System.Drawing.Color]::FromArgb(124, 33, 33)
$backgroundBottom = [System.Drawing.Color]::FromArgb(159, 47, 47)
$cream = [System.Drawing.Color]::FromArgb(255, 247, 240)
$gold = [System.Drawing.Color]::FromArgb(240, 198, 116)
$chipBorder = [System.Drawing.Color]::FromArgb(203, 105, 105)

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

        $accentPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(80, 176, 13, 126)) 6.5
        $goldBrush = [System.Drawing.SolidBrush]::new($gold)
        try { $graphics.FillPath($goldBrush, $accentPath) } finally { $goldBrush.Dispose(); $accentPath.Dispose() }

        $creamBrush = [System.Drawing.SolidBrush]::new($cream)
        try {
            $titleFont = [System.Drawing.Font]::new('Arial', 104, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            try { $graphics.DrawString('TentenQuiz', $titleFont, $creamBrush, 119, 189) } finally { $titleFont.Dispose() }

            $taglineFont = New-FittedFont $graphics $card.Text $card.Font $card.Size 930
            try {
                if ($card.Rtl) {
                    $format = [System.Drawing.StringFormat]::new()
                    try {
                        $format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft
                        $format.Alignment = [System.Drawing.StringAlignment]::Near
                        $format.LineAlignment = [System.Drawing.StringAlignment]::Near
                        $graphics.DrawString($card.Text, $taglineFont, $creamBrush, [System.Drawing.RectangleF]::new(128, 315, 906, 62), $format)
                    } finally { $format.Dispose() }
                } else {
                    $graphics.DrawString($card.Text, $taglineFont, $creamBrush, 128, 315)
                }
            } finally { $taglineFont.Dispose() }

            foreach ($chip in $chips) {
                $chipPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new($chip.X, 397, $chip.Width, 64)) 21
                $chipPen = [System.Drawing.Pen]::new($chipBorder, 1.5)
                try { $graphics.DrawPath($chipPen, $chipPath) } finally { $chipPen.Dispose(); $chipPath.Dispose() }

                $chipFont = [System.Drawing.Font]::new($chip.Font, 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
                $chipFormat = [System.Drawing.StringFormat]::new()
                try {
                    $chipFormat.Alignment = [System.Drawing.StringAlignment]::Center
                    $chipFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
                    $graphics.DrawString($chip.Text, $chipFont, $creamBrush, [System.Drawing.RectangleF]::new($chip.X, 397, $chip.Width, 64), $chipFormat)
                } finally { $chipFormat.Dispose(); $chipFont.Dispose() }
            }
        } finally { $creamBrush.Dispose() }

        $urlBrush = [System.Drawing.SolidBrush]::new($gold)
        $urlFont = [System.Drawing.Font]::new('Arial', 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        try { $graphics.DrawString('tentenquiz.com', $urlFont, $urlBrush, 128, 528) } finally { $urlFont.Dispose(); $urlBrush.Dispose() }

        $file = Join-Path $outputPath ("og-image-{0}.png" -f $card.Slug)
        $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host ("OK: {0}" -f $file)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
