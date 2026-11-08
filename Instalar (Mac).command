#!/bin/bash
cd "$(dirname "$0")" || exit 1
DESTINO="$HOME/.claude/skills/fabrica-de-videos"
echo "FÁBRICA DE VIDEOS"
echo
echo "Esto copia la skill en: $DESTINO"
echo "La skill deja a Claude usar la fábrica sin preguntarte cada vez mientras hace un video."
echo
read -r -p "¿Quieres instalarla? (s/n) " RESPUESTA
case "$RESPUESTA" in
  s|S) ;;
  *) exit 0 ;;
esac
mkdir -p "$HOME/.claude/skills"
rm -rf "$DESTINO"
cp -R "fabrica-de-videos" "$DESTINO" || { echo "No se pudo copiar la skill."; exit 1; }
echo
echo "Listo. Abre una sesión nueva de Claude y escribe: VIDEO NUEVO"
