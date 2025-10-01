# Mise à jour des modèles Cohere

## Problème
Le modèle `command-light` de Cohere a été supprimé le 15 septembre 2025 et n'est plus disponible.

## Solution
Mettre à jour votre fichier `.env` avec les modèles Cohere actuels :

### Modèles Cohere disponibles (2024) :

**Génération de texte :**
- `command-r` (recommandé)
- `command-r-plus` 
- `command-r-plus-4k`

**Embeddings :**
- `embed-english-v3.0` (1024 dimensions)
- `embed-multilingual-v3.0` (1024 dimensions)

### Configuration `.env` mise à jour :

```env
# Pour utiliser Cohere
GENERATION_BACKEND=cohere
EMBEDDING_BACKEND=cohere

# Modèles Cohere actuels
GENERATION_MODEL_ID=command-r
EMBEDDING_MODEL_ID=embed-english-v3.0
EMBEDDING_MODEL_SIZE=1024

# Clé API Cohere
COHERE_API_KEY=your_cohere_api_key_here
```

### Actions à effectuer :

1. **Mettre à jour votre `.env`** avec les modèles ci-dessus
2. **Redémarrer l'application** pour charger la nouvelle configuration
3. **Tester** avec un fichier PowerPoint pour vérifier que l'extraction fonctionne

### Modèles dépréciés à éviter :
- ❌ `command-light` (supprimé)
- ❌ `command` (supprimé)
- ❌ `command-x` (supprimé)

### Modèles recommandés :
- ✅ `command-r` (génération)
- ✅ `embed-english-v3.0` (embeddings)
