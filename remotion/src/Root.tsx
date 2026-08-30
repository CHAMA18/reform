import { Composition } from 'remotion';
import { ReformDemo } from './ReformDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReformDemo"
        component={ReformDemo}
        durationInFrames={30 * 90} // 90 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
