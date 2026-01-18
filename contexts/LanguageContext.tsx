import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'ko';

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  en: {
    // Header
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.signin': 'Sign In',
    'header.subtitle': '방구석 작곡가',
    
    // Help Modal
    'help.title': 'App Overview & Help',
    'help.intro': 'Mastering Composer is a powerful web-based audio tool designed to make professional mastering accessible. It combines professional presets with a high-fidelity browser-based DSP engine.',
    'help.feature.2.title': 'Manual Control',
    'help.feature.2.desc': 'Fine-tune every parameter including 3-band EQ, compressor thresholds, attack/release times, and stereo width.',
    'help.feature.3.title': 'Local Processing',
    'help.feature.3.desc': 'Your audio files never leave your device. All signal processing happens locally in your browser using the Web Audio API.',
    'help.feature.4.title': 'Batch Mode',
    'help.feature.4.desc': 'Upload multiple WAV files at once to apply consistent mastering settings across an entire album or EP.',
    'help.close': 'Close',

    // Hero
    'hero.badge': 'Web Audio Engine v1.0',
    'hero.title.p1': 'Professional Audio Mastering',
    'hero.title.p2': 'Reimagined',
    'hero.subtitle': 'Elevate your tracks with high-fidelity DSP processing. Drag, drop, and master instantly with zero latency.',
    
    // Uploader
    'upload.idle': 'Upload Audio Files',
    'upload.active': "Drop it like it's hot",
    'upload.desc': 'Drag & Drop WAV files here or',
    'upload.browse': 'browse your computer',
    'upload.support': 'SUPPORT: WAV (PCM)',
    'upload.error': 'Some files were excluded. Only WAV format is supported.',
    
    // Status
    'status.processing_batch': 'PROCESSING BATCH...',
    'status.processing_single': 'MASTERING AUDIO...',
    'status.dont_close': 'DO NOT CLOSE WINDOW',
    'status.batch_session': 'Batch Session',
    'status.ready': 'Ready',
    'status.items_queued': 'ITEMS QUEUED',
    
    // Labels
    'label.original': 'Original Mix',
    'label.preview': 'Input Preview',
    'label.master': 'Master Output',
    
    // Actions
    'btn.change_file': 'Change File',
    'btn.process': 'Process Master',
    'btn.reprocess': 'Reprocess',
    'btn.download': 'Download',
    'btn.cancel': 'Cancel',
    'btn.run_batch': 'Run Batch Process',
    'btn.download_zip': 'Download ZIP',
    
    // Batch Queue
    'batch.title': 'Batch Queue',
    'batch.processing': 'Processing',
    'batch.queued': 'Queued',
    'batch.done': 'Ready',
    'batch.failed': 'Failed',
    'batch.empty': 'Empty Queue',
    'batch.files': 'FILES',
    
    // Presets
    'presets.title': 'Quick Presets',
    'preset.universal.name': 'Universal',
    'preset.universal.desc': 'Balanced polish suitable for any genre.',
    'preset.streaming.name': 'Streaming',
    'preset.streaming.desc': 'Optimized for Spotify/Apple Music (-14 LUFS).',
    'preset.club.name': 'Club Ready',
    'preset.club.desc': 'Heavy bass boost and wide image.',
    'preset.fire.name': 'Fire',
    'preset.fire.desc': 'Aggressive loudness and saturation.',
    'preset.punch.name': 'Punch',
    'preset.punch.desc': 'Transient focus for hitting drums.',
    'preset.clarity.name': 'Clarity',
    'preset.clarity.desc': 'High-end air and mud removal.',
    'preset.podcast.name': 'Podcast',
    'preset.podcast.desc': 'Vocal leveling and speech clarity.',
    'preset.vintage.name': 'Vintage Warmth',
    'preset.vintage.desc': 'Analog tube warmth and rolled-off highs.',
    'preset.tape.name': 'Tape',
    'preset.tape.desc': 'Cohesive glue and subtle saturation.',
    'preset.natural.name': 'Natural',
    'preset.natural.desc': 'Transparent dynamic control.',
    'preset.spatial.name': 'Spatial',
    'preset.spatial.desc': 'Enhanced stereo field and depth.',
    'preset.cinematic.name': 'Cinematic',
    'preset.cinematic.desc': 'Huge dynamic range and epic atmosphere.',
    
    // Control Panel
    'controls.title': 'Manual Control Rack',
    'controls.eq': 'Parametric EQ',
    'controls.dynamics': 'Multiband Dynamics',
    'controls.imager': 'Stereo Imager',
    'controls.imager.desc': 'Values > 1.0 enhance side channel gain using M/S processing matrix.',
    'controls.mono': 'MONO',
    'controls.stereo': 'STEREO',
    'controls.wide': 'WIDE',
    
    // Footer
    'footer.rights': '© 2026 방구석 작곡가(5barTV). All rights reserved.',
  },
  ko: {
    // Header
    'nav.features': '기능',
    'nav.pricing': '가격',
    'nav.signin': '로그인',
    'header.subtitle': '방구석 작곡가',

    // Help Modal
    'help.title': '앱 개요 및 도움말',
    'help.intro': '방구석 작곡가(Mastering Composer)는 전문적인 마스터링을 누구나 쉽게 이용할 수 있도록 설계된 강력한 웹 기반 오디오 도구입니다. 전문적인 프리셋과 고성능 웹 DSP 엔진을 결합했습니다.',
    'help.feature.2.title': '정밀 수동 제어',
    'help.feature.2.desc': '3밴드 EQ, 컴프레서의 Threshold/Ratio/Attack/Release, 스테레오 너비 등 모든 파라미터를 사용자가 직접 미세 조정할 수 있습니다.',
    'help.feature.3.title': '로컬 프로세싱',
    'help.feature.3.desc': '오디오 파일은 서버로 전송되지 않습니다. 모든 신호 처리는 브라우저의 Web Audio API를 통해 로컬에서 이루어집니다.',
    'help.feature.4.title': '일괄 처리(Batch) 모드',
    'help.feature.4.desc': '여러 개의 WAV 파일을 한 번에 업로드하여 앨범이나 EP 전체에 일관된 마스터링 설정을 적용할 수 있습니다.',
    'help.close': '닫기',

    // Hero
    'hero.badge': 'Web Audio Engine v1.0',
    'hero.title.p1': '프로페셔널 오디오 마스터링',
    'hero.title.p2': '의 혁신',
    'hero.subtitle': '고해상도 DSP 프로세싱으로 당신의 트랙을 완성하세요. 드래그 앤 드롭으로 지연 시간 없이 즉시 마스터링됩니다.',

    // Uploader
    'upload.idle': '오디오 파일 업로드',
    'upload.active': '파일을 놓아주세요',
    'upload.desc': 'WAV 파일을 여기에 드래그하거나',
    'upload.browse': '내 컴퓨터에서 찾아보기',
    'upload.support': '지원 형식: WAV (PCM)',
    'upload.error': '일부 파일이 제외되었습니다. WAV 형식만 지원됩니다.',

    // Status
    'status.processing_batch': '일괄 처리 중...',
    'status.processing_single': '오디오 마스터링 중...',
    'status.dont_close': '창을 닫지 마세요',
    'status.batch_session': '일괄 작업 세션',
    'status.ready': '완료됨',
    'status.items_queued': '개 대기 중',

    // Labels
    'label.original': '원본 믹스',
    'label.preview': '입력 미리보기',
    'label.master': '마스터 출력',

    // Actions
    'btn.change_file': '파일 변경',
    'btn.process': '마스터링 시작',
    'btn.reprocess': '다시 처리하기',
    'btn.download': '다운로드',
    'btn.cancel': '취소',
    'btn.run_batch': '일괄 처리 시작',
    'btn.download_zip': 'ZIP 다운로드',

    // Batch Queue
    'batch.title': '작업 대기열',
    'batch.processing': '처리 중',
    'batch.queued': '대기',
    'batch.done': '완료',
    'batch.failed': '실패',
    'batch.empty': '대기열 비어있음',
    'batch.files': '개 파일',

    // Presets
    'presets.title': '빠른 프리셋',
    'preset.universal.name': '유니버설',
    'preset.universal.desc': '모든 장르에 적합한 균형 잡힌 설정.',
    'preset.streaming.name': '스트리밍',
    'preset.streaming.desc': 'Spotify/Apple Music 최적화 (-14 LUFS).',
    'preset.club.name': '클럽 레디',
    'preset.club.desc': '강력한 저음 부스트와 넓은 스테레오 이미지.',
    'preset.fire.name': '파이어',
    'preset.fire.desc': '공격적인 음압과 채도 향상.',
    'preset.punch.name': '펀치',
    'preset.punch.desc': '드럼의 타격감을 살리는 트랜지언트 강조.',
    'preset.clarity.name': '선명함',
    'preset.clarity.desc': '고음역의 공기감 추가 및 탁함 제거.',
    'preset.podcast.name': '팟캐스트',
    'preset.podcast.desc': '목소리 명료도 향상 및 레벨 평탄화.',
    'preset.vintage.name': '빈티지 웜스',
    'preset.vintage.desc': '따뜻한 아날로그 진공관 느낌과 고음역 롤오프.',
    'preset.tape.name': '테이프',
    'preset.tape.desc': '자연스러운 결합(Glue)과 미세한 채도.',
    'preset.natural.name': '내추럴',
    'preset.natural.desc': '투명하고 자연스러운 다이내믹 제어.',
    'preset.spatial.name': '스페이셜',
    'preset.spatial.desc': '스테레오 필드 확장 및 깊이감 부여.',
    'preset.cinematic.name': '시네마틱',
    'preset.cinematic.desc': '광활한 다이내믹 레인지와 웅장한 분위기.',

    // Control Panel
    'controls.title': '수동 제어 랙',
    'controls.eq': '파라메트릭 EQ',
    'controls.dynamics': '멀티밴드 다이내믹스',
    'controls.imager': '스테레오 이미저',
    'controls.imager.desc': '1.0 이상의 값은 M/S 처리를 사용하여 사이드 채널 게인을 증가시킵니다.',
    'controls.mono': '모노',
    'controls.stereo': '스테레오',
    'controls.wide': '와이드',

    // Footer
    'footer.rights': '© 2026 방구석 작곡가(5barTV). All rights reserved.',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ko');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
