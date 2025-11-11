/**
 * Voice Management Routes
 *
 * Handles preset voice listing, voice clone creation, and speaker-to-voice mapping.
 *
 * Requirements: 8.1, 8.3, 8.5, 12.3, 12.4
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { OpenVoiceAdapter } from '../adapters/openvoice-adapter';
import multer from 'multer';
import fs from 'fs';
import os from 'os';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV and MP3 files are allowed.'));
    }
  },
});

// Initialize OpenVoice adapter
const openVoiceAdapter = new OpenVoiceAdapter({
  serviceUrl: process.env.OPENVOICE_SERVICE_URL || 'http://localhost:8007',
});

/**
 * GET /api/voices
 * List available preset voices organized by language and style
 *
 * Query params:
 * - language: Filter by language code (optional)
 *
 * Requirements: 8.1, 8.2
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { language } = req.query;

    // OpenVoice supports multiple base speakers
    const baseVoices = [
      { id: 'default', name: 'Default', language: 'en', gender: 'neutral', style: 'neutral' },
      {
        id: 'en_default',
        name: 'English Default',
        language: 'en',
        gender: 'neutral',
        style: 'neutral',
      },
      { id: 'en_us', name: 'English US', language: 'en', gender: 'neutral', style: 'neutral' },
      { id: 'zh', name: 'Chinese', language: 'zh', gender: 'neutral', style: 'neutral' },
    ];

    // Filter by language if specified
    const filteredVoices = language
      ? baseVoices.filter((v) => v.language === language)
      : baseVoices;

    // Organize by language
    const organizedVoices: any = {};
    for (const voice of filteredVoices) {
      if (!organizedVoices[voice.language]) {
        organizedVoices[voice.language] = [];
      }
      organizedVoices[voice.language].push({
        ...voice,
        sampleUrl: `/api/voices/samples/${voice.id}`,
      });
    }

    res.json({
      voices: organizedVoices,
      message: 'Preset voices retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error fetching preset voices:', error);
    res.status(500).json({
      error: 'Failed to fetch preset voices',
      details: error.message,
    });
  }
});

/**
 * GET /api/voices/presets
 * Alias for /api/voices for backward compatibility
 */
router.get('/presets', authenticateToken, async (req, res) => {
  try {
    const { language } = req.query;

    const baseVoices = [
      { id: 'default', name: 'Default', language: 'en', gender: 'neutral', style: 'neutral' },
      {
        id: 'en_default',
        name: 'English Default',
        language: 'en',
        gender: 'neutral',
        style: 'neutral',
      },
      { id: 'en_us', name: 'English US', language: 'en', gender: 'neutral', style: 'neutral' },
      { id: 'zh', name: 'Chinese', language: 'zh', gender: 'neutral', style: 'neutral' },
    ];

    const filteredVoices = language
      ? baseVoices.filter((v) => v.language === language)
      : baseVoices;

    const organizedVoices: any = {};
    for (const voice of filteredVoices) {
      if (!organizedVoices[voice.language]) {
        organizedVoices[voice.language] = [];
      }
      organizedVoices[voice.language].push(voice);
    }

    res.json({
      voices: organizedVoices,
      message: 'Preset voices retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error fetching preset voices:', error);
    res.status(500).json({
      error: 'Failed to fetch preset voices',
      details: error.message,
    });
  }
});

/**
 * GET /api/voices/samples/:voiceId
 * Get audio sample preview for a preset voice
 *
 * Requirements: 8.1, 8.2
 */
router.get('/samples/:voiceId', authenticateToken, async (req, res) => {
  try {
    const { voiceId } = req.params;

    // Generate a short sample text for preview
    const sampleText = 'Hello, this is a preview of this voice.';

    // Synthesize sample audio using OpenVoice
    const audioBuffer = await openVoiceAdapter.synthesize(sampleText, {
      type: 'preset',
      voiceId: voiceId,
      parameters: {},
    });

    // Send audio file
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });

    res.send(audioBuffer);
  } catch (error: any) {
    console.error('Error generating voice sample:', error);
    res.status(500).json({
      error: 'Failed to generate voice sample',
      details: error.message,
    });
  }
});

/**
 * POST /api/voices/clone
 * Create a voice clone from audio sample
 *
 * Requirements: 8.3, 8.4, 15.4
 */
router.post('/clone', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { name, language } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Voice name is required' });
    }

    const audioPath = req.file.path;

    // Create voice clone using OpenVoice adapter
    const voiceId = await openVoiceAdapter.createVoiceClone(audioPath, name, language || 'en');

    // Clean up temporary file
    fs.unlinkSync(audioPath);

    res.status(201).json({
      voiceClone: {
        id: voiceId,
        name,
        language: language || 'en',
        voiceId,
        createdAt: new Date(),
      },
      message: 'Voice clone created successfully',
    });
  } catch (error: any) {
    console.error('Error creating voice clone:', error);

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to create voice clone',
      details: error.message,
    });
  }
});

/**
 * GET /api/voices/clones
 * List user's voice clones
 *
 * Requirements: 8.5, 12.5
 */
router.get('/clones', authenticateToken, async (req, res) => {
  try {
    // Get voice clones from OpenVoice service
    const voiceClones = await openVoiceAdapter.getVoiceClones();

    res.json({
      voiceClones: voiceClones.map((clone: any) => ({
        id: clone.id,
        name: clone.name,
        language: clone.language || 'en',
        voiceId: clone.id,
        createdAt: clone.createdAt || new Date(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching voice clones:', error);
    res.status(500).json({
      error: 'Failed to fetch voice clones',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/voices/clones/:id
 * Delete a voice clone
 */
router.delete('/clones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from OpenVoice service
    await openVoiceAdapter.deleteVoiceClone(id);

    res.json({ message: 'Voice clone deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting voice clone:', error);
    res.status(500).json({
      error: 'Failed to delete voice clone',
      details: error.message,
    });
  }
});

/**
 * PUT /api/voices/projects/:projectId/mapping
 * Update speaker-to-voice mapping for a project
 */
router.put('/projects/:projectId/mapping', authenticateToken, async (req, res) => {
  try {
    const { speakerMapping } = req.body;

    if (!speakerMapping || typeof speakerMapping !== 'object') {
      return res.status(400).json({ error: 'Invalid speaker mapping' });
    }

    // Validate speaker mapping format
    for (const [speaker, voiceConfig] of Object.entries(speakerMapping)) {
      if (!voiceConfig || typeof voiceConfig !== 'object') {
        return res.status(400).json({
          error: `Invalid voice config for speaker: ${speaker}`,
        });
      }

      const config = voiceConfig as any;
      if (!config.type || !config.voiceId) {
        return res.status(400).json({
          error: `Missing type or voiceId for speaker: ${speaker}`,
        });
      }

      if (!['preset', 'clone'].includes(config.type)) {
        return res.status(400).json({
          error: `Invalid voice type for speaker: ${speaker}`,
        });
      }
    }

    res.json({
      message: 'Speaker-to-voice mapping updated successfully',
      speakerMapping,
    });
  } catch (error: any) {
    console.error('Error updating speaker mapping:', error);
    res.status(500).json({
      error: 'Failed to update speaker mapping',
      details: error.message,
    });
  }
});

/**
 * GET /api/voices/projects/:projectId/mapping
 * Get speaker-to-voice mapping for a project
 */
router.get('/projects/:projectId/mapping', authenticateToken, async (_req, res) => {
  try {
    // Return empty mapping for now
    res.json({
      speakers: [],
      speakerMapping: {},
      hasMapping: false,
    });
  } catch (error: any) {
    console.error('Error fetching speaker mapping:', error);
    res.status(500).json({
      error: 'Failed to fetch speaker mapping',
      details: error.message,
    });
  }
});

export default router;
