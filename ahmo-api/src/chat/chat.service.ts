import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatEntity } from "./entities/chat.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { MemberEntity } from "../member/entities/member.entity";
import { UserService } from "../user/user.service";
import { classToPlain, plainToClass } from "class-transformer";
import {Server} from "socket.io";
import {MessageEntity} from "../message/entities/message.entity";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatEntity)
    private repository: Repository<ChatEntity>,
    @InjectRepository(MemberEntity)
    private memberRepository: Repository<MemberEntity>,
    private userService: UserService,
  ) {}
  private io: Server;

  async create(createChatDto: CreateChatDto, user: UserEntity): Promise<ChatEntity> {
    const chat = new ChatEntity();
    chat.name = createChatDto.name;
    chat.type = createChatDto.type;
    chat.admin = user;
    const group = createChatDto.members.split(',').map(memberId => +memberId);

       // Check if the user is the creator of the group
      if (!group.includes(user.id)) {
        throw new Error('Only the creator of the group can create the chat.');
      }

    const memberPromises = group.map(async memberId => {
      const member = new MemberEntity();
      member.user = await this.userService.findOne(memberId);
      member.chat = chat;
      return this.memberRepository.save(member);
    });
    const members = await Promise.all(memberPromises);
    chat.members = members;
    return this.repository.save(chat);
  }

  async findAll() {
    const qb = await this.repository.createQueryBuilder('chat')
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user');

    return qb.getMany()
  }

  async findOne(id: number) {
    return this.repository.findOne({where: {id}, relations: ['members', 'members.user', 'admin', 'messages', 'messages.sender', 'messages.chat']})
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
    return `This action removes a #${id} chat`;
  }

  async findChatsByUserId(userId: number) {
    const qb = this.repository.createQueryBuilder('chat');
    qb.leftJoin('chat.members', 'member');
    qb.leftJoin('member.user', 'user');
    qb.where('user.id = :currentUserId', { currentUserId: userId });
    qb.leftJoinAndSelect('chat.members', 'chatMembers');
    qb.leftJoinAndSelect('chatMembers.user', 'chatMembersUser');
    qb.leftJoinAndSelect('chat.messages', 'chatMessages');
    let chats = await qb.getMany();

    chats = chats.map(chat => {
      const lastMessage = chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
      delete chat.messages;
      return {
        ...chat,
        lastMessage
      }
    })
    return chats;
  }
}
