import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  NativeModules,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { BlockModule } = NativeModules;

type Ekran = 'secim' | 'aktif';

function App() {
  const [ekran, setEkran] = useState<Ekran>('secim');
  const [instagramSecili, setInstagramSecili] = useState(false);
  const [youtubeSecili, setYoutubeSecili] = useState(false);
  const [sure, setSure] = useState(0);
  const [enIyiSure, setEnIyiSure] = useState(0);
  const [reelsCount, setReelsCount] = useState(0);
  const [shortsCount, setShortsCount] = useState(0);

  useEffect(() => {
    const baslangicKontrol = async () => {
      try {
        const durum = await AsyncStorage.getItem('engelDurum');
        if (durum === 'aktif') {
          const insta = await AsyncStorage.getItem('instagramSecili');
          const yt = await AsyncStorage.getItem('youtubeSecili');
          setInstagramSecili(insta === 'true');
          setYoutubeSecili(yt === 'true');
          setEkran('aktif');
          BlockModule.baslat(insta === 'true', yt === 'true');
        }

        const enIyi = await AsyncStorage.getItem('enIyiSure');
        if (enIyi) setEnIyiSure(parseInt(enIyi));

        const stats = await BlockModule.istatistikleriOku();
        setReelsCount(stats.reelsCount);
        setShortsCount(stats.shortsCount);
      } catch (e) {}
    };
    baslangicKontrol();
  }, []);

  // Sayaç — her 1 saniye
  useEffect(() => {
    let sayacInterval: any;
    let istatInterval: any;

    if (ekran === 'aktif') {
      const sayacGuncelle = async () => {
        const baslangic = await AsyncStorage.getItem('baslangicZamani');
        if (baslangic) {
          const gecen = Math.floor((Date.now() - parseInt(baslangic)) / 1000);
          setSure(gecen);
        }
      };

      const istatGuncelle = async () => {
        try {
          const stats = await BlockModule.istatistikleriOku();
          setReelsCount(stats.reelsCount);
          setShortsCount(stats.shortsCount);
        } catch (e) {}
      };

      sayacGuncelle();
      istatGuncelle();

      sayacInterval = setInterval(sayacGuncelle, 1000);
      istatInterval = setInterval(istatGuncelle, 5000);
    }

    return () => {
      clearInterval(sayacInterval);
      clearInterval(istatInterval);
    };
  }, [ekran]);

  const sureyiFormat = (saniye: number) => {
    const saat = Math.floor(saniye / 3600);
    const dk = Math.floor((saniye % 3600) / 60);
    const sn = saniye % 60;
    if (saat > 0) {
      return `${saat}:${dk.toString().padStart(2, '0')}:${sn.toString().padStart(2, '0')}`;
    }
    return `${dk}:${sn.toString().padStart(2, '0')}`;
  };

  const baslat = async () => {
    if (baslatDisabled) return;
    try {
      const accessibilityAcik = await BlockModule.accessibilityAcikMi();
      if (!accessibilityAcik) {
        Alert.alert(
          'İzin Gerekli',
          'BlockApp\'in çalışması için Erişilebilirlik iznini açman gerekiyor.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarları Aç', onPress: () => BlockModule.accessibilityAc() },
          ]
        );
        return;
      }

      const simdi = Date.now();
      await AsyncStorage.setItem('engelDurum', 'aktif');
      await AsyncStorage.setItem('instagramSecili', String(instagramSecili));
      await AsyncStorage.setItem('youtubeSecili', String(youtubeSecili));
      await AsyncStorage.setItem('baslangicZamani', String(simdi));
      await BlockModule.istatistikleriSifirla();
      setReelsCount(0);
      setShortsCount(0);

      BlockModule.baslat(instagramSecili, youtubeSecili);
      setEkran('aktif');
    } catch (e) {
      Alert.alert('Hata', 'Bir şeyler ters gitti.');
    }
  };

  const durdur = async () => {
    try {
      const enIyi = await AsyncStorage.getItem('enIyiSure');
      const mevcutEnIyi = enIyi ? parseInt(enIyi) : 0;
      if (sure > mevcutEnIyi) {
        await AsyncStorage.setItem('enIyiSure', String(sure));
        setEnIyiSure(sure);
      }

      await AsyncStorage.setItem('engelDurum', 'pasif');
      BlockModule.durdur();
      setEkran('secim');
    } catch (e) {}
  };

  const baslatDisabled = !instagramSecili && !youtubeSecili;

  if (ekran === 'secim') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.icerik}>
          <View style={styles.header}>
            <Text style={styles.title}>QDS</Text>
          </View>
          <Text style={styles.subtitle}>Quit Doom Scrolling</Text>

          <View style={styles.kartlar}>
            <TouchableOpacity
              style={[styles.kart, instagramSecili && styles.kartSecili]}
              onPress={() => setInstagramSecili(!instagramSecili)}
              activeOpacity={0.7}>
              <Text style={styles.kartIkon}>📸</Text>
              <Text style={styles.kartAd}>Instagram</Text>
              <Text style={styles.kartAlt}>Reels</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.kart, youtubeSecili && styles.kartSecili]}
              onPress={() => setYoutubeSecili(!youtubeSecili)}
              activeOpacity={0.7}>
              <Text style={styles.kartIkon}>▶️</Text>
              <Text style={styles.kartAd}>YouTube</Text>
              <Text style={styles.kartAlt}>Shorts</Text>
            </TouchableOpacity>
          </View>

          {enIyiSure > 0 && (
            <View style={styles.enIyiKutu}>
              <Text style={styles.enIyiBaslik}>🏆 En İyi Süre</Text>
              <Text style={styles.enIyiSure}>{sureyiFormat(enIyiSure)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.buton, baslatDisabled && styles.butonDisabled]}
            onPress={baslatDisabled ? undefined : baslat}
            activeOpacity={0.8}>
            <Text style={styles.butonYazi}>Başlat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.icerik}>
        <View style={styles.aktifHeader}>
          <View style={styles.aktifDot} />
          <Text style={styles.aktifYazi}>Engelleme Aktif</Text>
        </View>

        <View style={styles.sureKutu}>
          <Text style={styles.sureYazi}>{sureyiFormat(sure)}</Text>
          <Text style={styles.sureAlt}>Don't worry, The little cat is just trying to protect you.</Text>
          <Text style={styles.sureEmoji}>🐱</Text>
          {enIyiSure > 0 && (
            <Text style={styles.enIyiAktif}>🏆 En iyi: {sureyiFormat(enIyiSure)}</Text>
          )}
        </View>

        <View style={styles.istatistikler}>
          <View style={styles.istatKart}>
            <Text style={styles.istatSayi}>{reelsCount}</Text>
            <Text style={styles.istatAlt}>📸 Reels Engellendi</Text>
          </View>
          <View style={styles.istatAyrac} />
          <View style={styles.istatKart}>
            <Text style={styles.istatSayi}>{shortsCount}</Text>
            <Text style={styles.istatAlt}>▶️ Shorts Engellendi</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.butonDurdur} onPress={durdur} activeOpacity={0.8}>
          <Text style={styles.butonYazi}>Durdur</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  icerik: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#c0392b',
    letterSpacing: -1,
  },
  titleVurgu: {
    fontSize: 38,
    fontWeight: '800',
    color: '#c0392b',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  kartlar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kart: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  kartSecili: {
    borderColor: '#c0392b',
    backgroundColor: '#1a0a0a',
  },
  kartIkon: {
    fontSize: 36,
    marginBottom: 12,
  },
  kartAd: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  kartAlt: {
    fontSize: 12,
    color: '#444444',
  },
  enIyiKutu: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    width: '100%',
  },
  enIyiBaslik: {
    fontSize: 12,
    color: '#444444',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  enIyiSure: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  buton: {
    width: '100%',
    backgroundColor: '#c0392b',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  butonDisabled: {
    backgroundColor: '#1a1a1a',
  },
  butonDurdur: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  butonYazi: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aktifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 48,
  },
  aktifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c0392b',
  },
  aktifYazi: {
    fontSize: 14,
    color: '#c0392b',
    fontWeight: '600',
    letterSpacing: 1,
  },
  sureKutu: {
    alignItems: 'center',
    marginBottom: 48,
  },
  sureYazi: {
    fontSize: 72,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -2,
  },
  sureEmoji: {
    fontSize: 24,
    marginTop: 6,
    textAlign: 'center',
},
  sureAlt: {
    fontSize: 13,
    color: '#444444',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  enIyiAktif: {
    fontSize: 14,
    color: '#444444',
    marginTop: 12,
  },
  istatistikler: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  istatKart: {
    flex: 1,
    alignItems: 'center',
  },
  istatAyrac: {
    width: 1,
    backgroundColor: '#222222',
  },
  istatSayi: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  istatAlt: {
    fontSize: 12,
    color: '#444444',
  },
});

export default App;