import javax.sound.sampled.*;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * 音频管理器 - 用于播放游戏中的音效和背景音乐
 * 使用 Java Sound API 播放 WAV 文件
 */
public class AudioManager {
    private static AudioManager instance;
    
    // 音频缓存
    private Map<String, Clip> soundClips;
    private Clip bgmClip;
    
    // 音量控制
    private float sfxVolume = 0.8f;
    private float bgmVolume = 0.5f;
    private boolean enabled = true;
    private boolean bgmPlaying = false;
    
    // 音频文件路径（支持多种运行环境）
    private static final String[] AUDIO_PATHS = {
        "../static/audio/",    // 从 for_java 运行
        "static/audio/",       // 从项目根目录运行
        "./static/audio/"      // 从 dist 目录运行 JAR
    };
    private String audioPath;
    
    private AudioManager() {
        soundClips = new HashMap<>();
    }
    
    public static synchronized AudioManager getInstance() {
        if (instance == null) {
            instance = new AudioManager();
        }
        return instance;
    }
    
    /**
     * 加载音频文件
     */
    private String getAudioPath() {
        if (audioPath != null) {
            return audioPath;
        }
        
        for (String path : AUDIO_PATHS) {
            File testFile = new File(path + "bgm.wav");
            if (testFile.exists()) {
                audioPath = path;
                return path;
            }
        }
        
        // 默认使用第一个路径
        audioPath = AUDIO_PATHS[0];
        return audioPath;
    }
    
    public void loadSound(String name, String filename) {
        try {
            String path = getAudioPath();
            File file = new File(path + filename);
            if (!file.exists()) {
                System.err.println("音频文件不存在: " + file.getAbsolutePath());
                return;
            }
            
            AudioInputStream audioStream = AudioSystem.getAudioInputStream(file);
            Clip clip = AudioSystem.getClip();
            clip.open(audioStream);
            
            soundClips.put(name, clip);
            
        } catch (UnsupportedAudioFileException | IOException | LineUnavailableException e) {
            System.err.println("加载音频失败: " + filename);
            e.printStackTrace();
        }
    }
    
    /**
     * 初始化所有音效
     */
    public void init() {
        loadSound("jump", "jump.wav");
        loadSound("shoot", "shoot.wav");
        loadSound("missile", "missile.wav");
        loadSound("hit", "hit.wav");
        loadSound("enemy_spawn", "enemy_spawn.wav");
        loadSound("boss_spawn", "boss_spawn.wav");
        loadSound("gameover", "gameover.wav");
        
        // 预加载背景音乐
        loadBGM();
    }
    
    /**
     * 加载背景音乐
     */
    private void loadBGM() {
        try {
            String path = getAudioPath();
            File file = new File(path + "bgm.wav");
            if (!file.exists()) {
                System.err.println("背景音乐文件不存在: " + file.getAbsolutePath());
                return;
            }
            
            AudioInputStream audioStream = AudioSystem.getAudioInputStream(file);
            bgmClip = AudioSystem.getClip();
            bgmClip.open(audioStream);
            
            // 添加循环监听器
            bgmClip.addLineListener(event -> {
                if (event.getType() == LineEvent.Type.STOP) {
                    if (bgmPlaying) {
                        bgmClip.setFramePosition(0);
                        bgmClip.start();
                    }
                }
            });
            
        } catch (UnsupportedAudioFileException | IOException | LineUnavailableException e) {
            System.err.println("加载背景音乐失败");
            e.printStackTrace();
        }
    }
    
    /**
     * 设置音量
     */
    private void setVolume(Clip clip, float volume) {
        if (clip == null) return;
        
        try {
            FloatControl gainControl = (FloatControl) clip.getControl(FloatControl.Type.MASTER_GAIN);
            // 将 0.0-1.0 转换为分贝
            float dB = (float) (Math.log10(Math.max(0.001, volume)) * 20);
            gainControl.setValue(Math.max(gainControl.getMinimum(), 
                Math.min(gainControl.getMaximum(), dB)));
        } catch (IllegalArgumentException e) {
            // 某些音频格式可能不支持音量控制
        }
    }
    
    /**
     * 播放音效（可以重叠）
     */
    public void playSound(String name) {
        if (!enabled) return;
        
        Clip clip = soundClips.get(name);
        if (clip == null) {
            System.err.println("音效未加载: " + name);
            return;
        }
        
        // 创建新的 Clip 以支持重叠播放
        try {
            String path = getAudioPath();
            AudioInputStream audioStream = AudioSystem.getAudioInputStream(
                new File(path + getFilenameForSound(name)));
            Clip newClip = AudioSystem.getClip();
            newClip.open(audioStream);
            setVolume(newClip, sfxVolume);
            newClip.start();
            
            // 播放完成后关闭
            newClip.addLineListener(event -> {
                if (event.getType() == LineEvent.Type.STOP) {
                    event.getLine().close();
                }
            });
            
        } catch (Exception e) {
            // 回退到简单播放
            clip.stop();
            clip.setFramePosition(0);
            setVolume(clip, sfxVolume);
            clip.start();
        }
    }
    
    private String getFilenameForSound(String name) {
        switch (name) {
            case "jump": return "jump.wav";
            case "shoot": return "shoot.wav";
            case "missile": return "missile.wav";
            case "hit": return "hit.wav";
            case "enemy_spawn": return "enemy_spawn.wav";
            case "boss_spawn": return "boss_spawn.wav";
            case "gameover": return "gameover.wav";
            default: return name + ".wav";
        }
    }
    
    /**
     * 播放背景音乐
     */
    public void playBackgroundMusic() {
        if (!enabled || bgmClip == null || bgmPlaying) return;
        
        bgmPlaying = true;
        bgmClip.setFramePosition(0);
        setVolume(bgmClip, bgmVolume);
        bgmClip.start();
    }
    
    /**
     * 停止背景音乐
     */
    public void stopBackgroundMusic() {
        bgmPlaying = false;
        if (bgmClip != null) {
            bgmClip.stop();
            bgmClip.setFramePosition(0);
        }
    }
    
    /**
     * 暂停背景音乐
     */
    public void pauseBackgroundMusic() {
        if (bgmClip != null) {
            bgmClip.stop();
        }
    }
    
    /**
     * 恢复背景音乐
     */
    public void resumeBackgroundMusic() {
        if (enabled && bgmPlaying && bgmClip != null) {
            bgmClip.start();
        }
    }
    
    // ==================== 游戏音效快捷方法 ====================
    
    public void playJumpSound() {
        playSound("jump");
    }
    
    public void playShootSound() {
        playSound("shoot");
    }
    
    public void playMissileSound() {
        playSound("missile");
    }
    
    public void playHitSound() {
        playSound("hit");
    }
    
    public void playEnemyAppearSound() {
        playSound("enemy_spawn");
    }
    
    public void playBossAppearSound() {
        playSound("boss_spawn");
    }
    
    public void playGameOverSound() {
        playSound("gameover");
    }
    
    // ==================== 设置方法 ====================
    
    public void setSfxVolume(float volume) {
        this.sfxVolume = Math.max(0.0f, Math.min(1.0f, volume));
    }
    
    public void setBgmVolume(float volume) {
        this.bgmVolume = Math.max(0.0f, Math.min(1.0f, volume));
        if (bgmClip != null) {
            setVolume(bgmClip, bgmVolume);
        }
    }
    
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        if (!enabled) {
            stopBackgroundMusic();
        }
    }
    
    public boolean isEnabled() {
        return enabled;
    }
    
    /**
     * 释放资源
     */
    public void dispose() {
        stopBackgroundMusic();
        
        for (Clip clip : soundClips.values()) {
            if (clip != null) {
                clip.close();
            }
        }
        
        if (bgmClip != null) {
            bgmClip.close();
        }
    }
}
