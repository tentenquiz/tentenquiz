# TentenQuiz Azure Speech 음성 준비

## 보안 원칙

- Azure API 키를 채팅에 붙여 넣지 않습니다.
- API 키를 `tentenquiz` 웹 공개 폴더 안에 저장하지 않습니다.
- 비밀 설정 파일은 프로젝트 상위의 `.secrets` 폴더에만 둡니다.
- 웹사이트에는 생성이 끝난 MP3 파일만 배포합니다.

## 비밀 설정 파일

파일 위치:

`D:\텐텐퀴즈글로벌프로젝트\프로젝트\.secrets\azure-speech.env`

파일을 메모장으로 열고 다음 줄의 안내 문구만 실제 KEY 1 또는 KEY 2 값으로 바꿉니다.

`AZURE_SPEECH_KEY=여기에_API_키를_입력하세요`

지역은 다음 값으로 그대로 유지합니다.

`AZURE_SPEECH_REGION=koreacentral`

## 비교용 음성 구성

- 학습 언어 12개
- 언어별 표준 Neural 후보 2개
- 후보 음성마다 대표 단어 5개를 한 파일에서 차례로 재생
- 총 24개 비교용 MP3 생성
- 형식: 24kHz, 48kbps, mono MP3

일본어는 한자가 아니라 `reading_ja`의 히라가나를 Azure에 보내 정확한 읽기를 유도합니다. 중국어는 병음이나 주음부호가 아니라 실제 중국어 표제어를 합성합니다.

## 앵커 톤·학습 속도 비교

`prepare_anchor_audition.js`는 같은 후보를 다음 두 속도로 생성합니다.

- 권장 속도: 기본의 92% (`rate="-8%"`)
- 느린 비교: 기본의 88% (`rate="-12%"`)

Azure 음성 목록의 `StyleList`에 `newscast`가 실제로 있는 음성에만 뉴스 스타일을 적용합니다. 지원하지 않는 음성에는 스타일 이름을 억지로 넣지 않고 중립 음성의 속도만 조절하며, 비교 화면에도 `명료한 중립형`으로 표시합니다.

실행 예:

`node tools/azure-tts/prepare_anchor_audition.js`

이 비교는 목소리와 기본 속도를 고르기 위한 것입니다. 개별 단어의 실제 발음 정확성은 별도의 위험 단어 목록, 발음 재정의, 자동 파일 검사와 사람의 청취 검수를 통과해야 합니다.

## 현재 단계에서 하지 않는 작업

- 30,000개 전체 음성 생성
- JSON의 `audioFile_*` 필드 변경
- API 키를 사용하는 브라우저 코드 추가

12개 언어의 목소리를 확정하고 예상 비용을 계산한 뒤에만 전체 생성을 시작합니다.

## 확정된 언어 생성

- 한국어: `ko-KR-SunHiNeural`, 기본의 88%, `generate_korean_audio.js`
- 일본어: `ja-JP-NanamiNeural`, 기본의 88%, `generate_japanese_audio.js`

일본어 합성에는 화면용 한자 표제어가 아니라 `reading_ja`의 히라가나만 사용합니다. 두 도구 모두 중간 실행을 이어받을 수 있고, 2,500개 파일이 모두 준비된 뒤에만 `--commit-data`로 해당 언어의 `audioFile_*` 경로를 연결합니다. 연결 전 데이터 10개는 `backups` 아래에 자동 백업합니다.
