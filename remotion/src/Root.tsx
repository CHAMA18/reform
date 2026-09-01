import { Composition } from 'remotion';
import { ReformDemo } from './ReformDemo';
import { ReformCinematic } from './ReformCinematic';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReformDemo"
        component={ReformDemo}
        durationInFrames={30 * 180} // 180 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ReformCinematic"
        component={ReformCinematic}
        durationInFrames={30 * 180} // 180 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
