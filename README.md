# CLZ Schoolplein Dark Mode

Een Google Chrome-extensie die dark mode inschakelt voor de CLZ **Schoolplein** webpagina. Deze extensie bevat meerdere presets, een contrast-checker en beeldinstellingen om de leesbaarheid te verbeteren. (Bron: de repositorypagina). :contentReference[oaicite:0]{index=0}

---

## Features
- Actieve dark mode voor CLZ Schoolplein.
- Voorinstellingen (presets) voor snelle instellingen.
- Contrast-checker om tekst/achtergrond verhouding te controleren.
- Beeldinstellingen (bijv. afbeeldingen dimmen of aanpassen).
- Eenvoudige popup UI voor snelle bediening. :contentReference[oaicite:1]{index=1}

---

## Installatie (ontwikkelmodus)
> Gebruik deze stappen om de uitbreiding lokaal te laden in Chrome/Chromium:

1. Clone de repository:
```bash
git clone https://github.com/DaRealPSL/clzschoolplein-darkmode.git
cd clzschoolplein-darkmode
```
2. Open Chrome en ga naar `chrome://extensions/`.

3. Schakel **Developer mode** (ontwikkelaarsmodus) aan (rechtboven).

4. Klik op **Load unpacked** en selecteer de rootmap van deze repository (de map met `manifest.json`).

5. De extensie verschijnt nu in je browserbalk. Navigeer naar CLZ Schoolplein en klik op het extensie-icoon om instellingen aan te passen.

---

## Gebruik

1. Open de CLZ Schoolplein website in Chrome.
2. Klik op het extensie-icoon (bovenin de browser).
3. Kies een preset of pas handmatig contrast/beeldinstellingen aan.
4. De extensie injecteert de benodigde CSS/JS om de dark mode toe te passen.

---

## Bestandsoverzicht

* `manifest.json` – Chrome manifest (met metadata en permissies). ([GitHub][1])
* `index.html` – (eventueel) voorbeeldpagina of popup HTML. ([GitHub][2])
* `popup/` – UI-bestanden voor de extensie-popup. ([GitHub][2])
* `content/` – content scripts die op de Schoolplein-pagina draaien. ([GitHub][2])
* `icons/` – icoonbestanden voor de extensie. ([GitHub][2])

> (Bestanden en mappen zichtbaar op de repositorypagina.) ([GitHub][2])

---

## Releases / Changelog

Laatste release: **CLZ Dark Mode v1.2** — *Presets, Contrastchecker & Beeldinstellingen* (Latest Oct 30, 2025). ([GitHub][2])

---

## Contact

Voor vragen of feedback: gebruik de **Issues** sectie van de GitHub-repository. ([GitHub][2])
