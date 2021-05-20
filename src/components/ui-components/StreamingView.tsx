import React, { useEffect, useMemo, useState } from 'react';
import Button from './helpers/Button';
import TextBox from './helpers/TextBox';

import TranscribeController from '../../controllers/transcribe.controller';
import logger from '../../utils/logger';
import useTranscribeConfig from '../../hooks/use-transcribe-config';

const StreamingView: React.FC<{
  componentName: 'StreamingView';
}> = () => {
  const [transcribeConfig] = useTranscribeConfig();
  const [recognizingText, setRecognizingText] = useState<string>('');
  const [started, setStarted] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>('');

  const transcribeController = useMemo(() => new TranscribeController(), []);

  const handleRecognizingTextChange = (event: React.ChangeEvent<HTMLInputElement>)  => {
    setRecognizingText(event.target.value);
  };

  useEffect(() => {
    transcribeController.setConfig(transcribeConfig);

    // if config is being updated, then stop the transcription
    setStarted(false);
  }, [transcribeConfig, transcribeController]);
  

  useEffect(() => {
    (async () => {
      if (started) {
        logger.info('attempting to start api invoke.');
        logger.info('recoginzingText: ', recognizingText);

        await transcribeController.invokeSentimentAPI(recognizingText);
      } 
    })();
  }, [started, transcribeController, recognizingText]);

  useEffect(() => {
    const displayResult = (result: string) => {
      setTranslatedText(result);
      setStarted(false);
    };

    transcribeController.on('result', displayResult);

    return () => {
      transcribeController.removeListener('result', displayResult);
    };
  }, [transcribeController]);

  return (
    <div className="flex-grow flex flex-col">
      <div className="flex-grow flex flex-row justify-center">
        <TextBox
          name="streaming-result"
          placeholder="您的要分析的舆情文本在这里"
          value={recognizingText}
          onInputChange={handleRecognizingTextChange}
        />

        <TextBox
          name="translate-result"
          placeholder="您的分析结果将显示在这里"
          value={translatedText}
        />
      </div>
      <div className="flex-grow flex flex-row justify-center">
        <Button
          text="开始分析"
          color="green"
          disabled={started}
          onClick={() => setStarted(true)}
        />
      </div>

    </div>
  );
};

export default StreamingView;
