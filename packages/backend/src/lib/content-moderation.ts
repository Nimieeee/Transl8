import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Content Moderation Service
 * Handles automated content scanning and removal
 */
class ContentModerationService {
  /**
   * Scan content for prohibited material
   */
  async scanContent(contentType: string, contentId: string): Promise<void> {
    try {
      logger.info('Scanning content', { contentType, contentId });

      let flagged = false;
      let reason = '';

      switch (contentType) {
        case 'project':
          flagged = await this.scanProject(contentId);
          reason = 'Project contains prohibited content';
          break;
        case 'voice_clone':
          flagged = await this.scanVoiceClone(contentId);
          reason = 'Voice clone violates policy';
          break;
        case 'transcript':
          flagged = await this.scanTranscript(contentId);
          reason = 'Transcript contains prohibited content';
          break;
        case 'translation':
          flagged = await this.scanTranslation(contentId);
          reason = 'Translation contains prohibited content';
          break;
      }

      if (flagged) {
        await this.flagContent(contentType, contentId, reason);
      }
    } catch (error) {
      logger.error('Content scan failed', { error, contentType, contentId });
    }
  }

  /**
   * Scan project for prohibited content
   */
  private async scanProject(projectId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        transcripts: true,
        translations: true,
      },
    });

    if (!project) return false;

    // Check project name
    if (this.containsProhibitedTerms(project.name)) {
      return true;
    }

    // Check transcripts
    for (const transcript of project.transcripts) {
      const content = transcript.editedContent || transcript.content;
      if (this.containsProhibitedTerms(JSON.stringify(content))) {
        return true;
      }
    }

    // Check translations
    for (const translation of project.translations) {
      const content = translation.editedContent || translation.content;
      if (this.containsProhibitedTerms(JSON.stringify(content))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan voice clone for policy violations
   */
  private async scanVoiceClone(voiceCloneId: string): Promise<boolean> {
    const voiceClone = await prisma.voiceClone.findUnique({
      where: { id: voiceCloneId },
    });

    if (!voiceClone) return false;

    // Check voice clone name for prohibited terms
    if (this.containsProhibitedTerms(voiceClone.name)) {
      return true;
    }

    // Check if voice clone name matches known public figures (basic check)
    const publicFigureNames = [
      'obama', 'trump', 'biden', 'musk', 'bezos', 'gates',
      'celebrity', 'president', 'politician',
    ];

    const nameLower = voiceClone.name.toLowerCase();
    for (const figure of publicFigureNames) {
      if (nameLower.includes(figure)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan transcript for prohibited content
   */
  private async scanTranscript(transcriptId: string): Promise<boolean> {
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
    });

    if (!transcript) return false;

    const content = transcript.editedContent || transcript.content;
    return this.containsProhibitedTerms(JSON.stringify(content));
  }

  /**
   * Scan translation for prohibited content
   */
  private async scanTranslation(translationId: string): Promise<boolean> {
    const translation = await prisma.translation.findUnique({
      where: { id: translationId },
    });

    if (!translation) return false;

    const content = translation.editedContent || translation.content;
    return this.containsProhibitedTerms(JSON.stringify(content));
  }

  /**
   * Check if text contains prohibited terms
   */
  private containsProhibitedTerms(text: string): boolean {
    const prohibitedTerms = [
      // Hate speech
      'hate', 'racist', 'nazi', 'terrorism',
      // Violence
      'kill', 'murder', 'bomb', 'weapon',
      // Sexual content
      'porn', 'xxx', 'sex',
      // Illegal activities
      'drug', 'cocaine', 'heroin', 'meth',
      // Fraud
      'scam', 'phishing', 'fraud',
    ];

    const textLower = text.toLowerCase();
    
    // Simple keyword matching (in production, use ML-based content moderation)
    for (const term of prohibitedTerms) {
      if (textLower.includes(term)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Flag content for manual review
   */
  private async flagContent(
    contentType: string,
    contentId: string,
    reason: string
  ): Promise<void> {
    try {
      await prisma.contentFlag.create({
        data: {
          contentType,
          contentId,
          reason,
          status: 'pending',
        },
      });

      logger.warn('Content flagged for review', {
        contentType,
        contentId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to flag content', { error, contentType, contentId });
    }
  }

  /**
   * Remove content (called after manual review approval)
   */
  async removeContent(contentType: string, contentId: string): Promise<void> {
    try {
      logger.info('Removing content', { contentType, contentId });

      switch (contentType) {
        case 'project':
          await this.removeProject(contentId);
          break;
        case 'voice_clone':
          await this.removeVoiceClone(contentId);
          break;
        case 'transcript':
          await this.removeTranscript(contentId);
          break;
        case 'translation':
          await this.removeTranslation(contentId);
          break;
      }

      logger.info('Content removed successfully', { contentType, contentId });
    } catch (error) {
      logger.error('Failed to remove content', { error, contentType, contentId });
      throw error;
    }
  }

  /**
   * Remove project and associated files
   */
  private async removeProject(projectId: string): Promise<void> {
    // Note: File deletion from storage should be handled by your storage service
    // For now, we'll just delete from database (cascade delete configured)
    await prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Remove voice clone and associated files
   */
  private async removeVoiceClone(voiceCloneId: string): Promise<void> {
    // Note: File deletion from storage should be handled by your storage service
    // For now, we'll just delete from database
    await prisma.voiceClone.delete({
      where: { id: voiceCloneId },
    });
  }

  /**
   * Remove transcript
   */
  private async removeTranscript(transcriptId: string): Promise<void> {
    await prisma.transcript.delete({
      where: { id: transcriptId },
    });
  }

  /**
   * Remove translation
   */
  private async removeTranslation(translationId: string): Promise<void> {
    await prisma.translation.delete({
      where: { id: translationId },
    });
  }
}

export const contentModerationService = new ContentModerationService();
